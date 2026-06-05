package com.mathrace.service;

import com.mathrace.dto.race.LeaderboardEntry;
import com.mathrace.dto.race.PathChoiceRequest;
import com.mathrace.dto.race.PathChoiceResponse;
import com.mathrace.dto.race.QuestionResponse;
import com.mathrace.dto.race.SubmitAnswerRequest;
import com.mathrace.dto.race.SubmitAnswerResponse;
import com.mathrace.entity.Answer;
import com.mathrace.entity.GameEvent;
import com.mathrace.entity.GeneratedQuestion;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceResult;
import com.mathrace.entity.RaceRoom;
import com.mathrace.exception.ApiException;
import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.model.enums.EventType;
import com.mathrace.model.enums.ParticipantStatus;
import com.mathrace.model.enums.PathChoice;
import com.mathrace.model.enums.RaceRoomStatus;
import com.mathrace.model.runtime.GameSession;
import com.mathrace.model.runtime.RuntimeParticipantState;
import com.mathrace.repository.AnswerRepository;
import com.mathrace.repository.GameEventRepository;
import com.mathrace.repository.GeneratedQuestionRepository;
import com.mathrace.repository.RaceParticipantRepository;
import com.mathrace.repository.RaceResultRepository;
import com.mathrace.repository.RaceRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class GameEngineService {

    private final RaceRoomService raceRoomService;
    private final RaceRoomRepository raceRoomRepository;
    private final RaceParticipantRepository raceParticipantRepository;
    private final GeneratedQuestionRepository generatedQuestionRepository;
    private final RaceResultRepository raceResultRepository;
    private final AnswerRepository answerRepository;
    private final GameEventRepository gameEventRepository;
    private final QuestionGeneratorService questionGeneratorService;
    private final ScoringEngine scoringEngine;
    private final LuckEventEngine luckEventEngine;
    private final SseEventPublisher sseEventPublisher;

    private final Map<Long, GameSession> sessions = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Transactional
    public void startRace(String roomCode) {
        RaceRoom room = raceRoomService.startRace(roomCode);
        GameSession session = new GameSession();
        session.setRoomId(room.getId());
        session.setRoomCode(room.getRoomCode());
        session.setStatus(RaceRoomStatus.RUNNING);
        raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room)
            .stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .forEach(p -> session.getParticipants().put(p.getId(), new RuntimeParticipantState()));
        sessions.put(room.getId(), session);
        sseEventPublisher.publish(room.getRoomCode(), "race_started", Map.of("status", "RUNNING"));
    }

    @Transactional
    public void endRace(String roomCode) {
        RaceRoom room = raceRoomService.endRace(roomCode);
        finalizeRace(room, null);
    }

    @Transactional(readOnly = true)
    public QuestionResponse nextQuestion(String roomCode, Long participantId) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantOrThrow(participantId);
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room");
        }
        if (participant.getParticipantStatus() != ParticipantStatus.ACTIVE) {
            throw new ApiException("PARTICIPANT_NOT_APPROVED", "Participant is not approved");
        }
        if (room.getStatus() != RaceRoomStatus.RUNNING) {
            throw new ApiException("ROOM_NOT_RUNNING", "Race not running");
        }

        DifficultyLevel difficulty = resolveDifficulty(room, participantId);
        QuestionResponse response = questionGeneratorService.generateNextQuestion(room, participant, difficulty);
        sseEventPublisher.publish(room.getRoomCode(), "question_ready", Map.of(
            "participantId", participantId,
            "questionId", response.questionId()
        ));
        return response;
    }

    @Transactional
    public SubmitAnswerResponse submitAnswer(String roomCode, Long participantId, SubmitAnswerRequest request) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantOrThrow(participantId);
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room");
        }
        if (participant.getParticipantStatus() != ParticipantStatus.ACTIVE) {
            throw new ApiException("PARTICIPANT_NOT_APPROVED", "Participant is not approved");
        }
        if (room.getStatus() != RaceRoomStatus.RUNNING) {
            throw new ApiException("ROOM_NOT_RUNNING", "Race not running");
        }

        GeneratedQuestion question = generatedQuestionRepository.findById(request.questionId())
            .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", "Question not found"));
        if (question.isAnswered()) {
            throw new ApiException("QUESTION_ALREADY_ANSWERED", "Question already answered");
        }
        if (!question.getRaceParticipant().getId().equals(participantId)) {
            throw new ApiException("QUESTION_NOT_OWNED", "Question does not belong to participant");
        }

        List<RaceParticipant> rankingBeforeAnswer = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room).stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .toList();
        Map<Long, Integer> oldRankMap = new HashMap<>();
        for (int i = 0; i < rankingBeforeAnswer.size(); i++) {
            oldRankMap.put(rankingBeforeAnswer.get(i).getId(), i + 1);
        }

        int roomLeaderProgress = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room).stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .mapToInt(RaceParticipant::getProgressPoints)
            .max()
            .orElse(0);
        double avgProgress = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room).stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .mapToInt(RaceParticipant::getProgressPoints)
            .average()
            .orElse(0.0);

        RuntimeParticipantState state = sessionState(room.getId(), participant.getId());
        int effectiveResponseTimeMs = request.responseTimeMs();
        if (state.getSlowdownQuestionsRemaining() > 0) {
            effectiveResponseTimeMs = request.responseTimeMs() * 2;
        }
        boolean timedOut = effectiveResponseTimeMs > question.getMaxTimeMs();
        boolean isCorrect = !timedOut && question.getCorrectAnswer().trim().equals(request.submittedAnswer().trim());
        int delta;
        SubmitAnswerResponse.EventData eventData = null;
        String streakMessage = null;

        if (isCorrect) {
            participant.setCorrectCount(participant.getCorrectCount() + 1);
            participant.setStreakCount(participant.getStreakCount() + 1);

            LuckEventEngine.LuckOutcome luckOutcome = luckEventEngine.maybeTrigger(room, participant);
            applyLuckEffects(state, luckOutcome);
            int luckModifier = luckOutcome.exists() ? luckOutcome.impactPoints() : 0;
            double balanceMultiplier = scoringEngine.calculateBalanceMultiplier(participant, roomLeaderProgress, avgProgress);

            delta = scoringEngine.calculateCorrectDelta(
                question.getDifficulty(),
                Math.min(effectiveResponseTimeMs, question.getMaxTimeMs()),
                question.getMaxTimeMs(),
                participant.getStreakCount(),
                state.getCurrentPathChoice(),
                balanceMultiplier,
                luckModifier
            );

            if (isHighwayChallenge(state)) {
                delta += 180;
            } else if (isDirtRoadChallenge(state)) {
                delta = Math.max(8, (int) Math.round(delta * 0.55));
            }
            if (state.getSlowdownQuestionsRemaining() > 0) {
                delta = (int) Math.round(delta * 0.5);
            }

            if (participant.getStreakCount() > 0 && participant.getStreakCount() % 3 == 0) {
                streakMessage = "רצף " + participant.getStreakCount() + " תשובות נכונות";
            }

            if (luckOutcome.exists()) {
                eventData = new SubmitAnswerResponse.EventData(
                    luckOutcome.type().name(),
                    luckOutcome.impactPoints(),
                    luckOutcome.message()
                );
            } else if (room.isEnablePathChoice() && !isPathChallengeActive(state) && !state.isPendingPathDecision()) {
                state.setDecisionMeter(state.getDecisionMeter() + 30);
                if (state.getDecisionMeter() >= 100) {
                    state.setDecisionMeter(0);
                    state.setPendingPathDecision(true);
                    GameEvent event = new GameEvent();
                    event.setRaceRoom(room);
                    event.setRaceParticipant(participant);
                    event.setEventType(EventType.PATH_DECISION);
                    event.setPayloadJson("{\"message\":\"בחר מסלול: אוטוסטרדה או דרך עפר\"}");
                    gameEventRepository.save(event);
                    eventData = new SubmitAnswerResponse.EventData("PATH_DECISION", 0, "בחר מסלול: אוטוסטרדה או דרך עפר");
                }
            } else if (room.isEnablePathChoice() && !isPathChallengeActive(state) && !state.isPendingPathDecision() && random.nextInt(100) < 8) {
                state.setPendingPathDecision(true);
                state.setDecisionMeter(0);
                GameEvent event = new GameEvent();
                event.setRaceRoom(room);
                event.setRaceParticipant(participant);
                event.setEventType(EventType.PATH_DECISION);
                event.setPayloadJson("{\"message\":\"בחר מסלול: אוטוסטרדה או דרך עפר\"}");
                gameEventRepository.save(event);
                eventData = new SubmitAnswerResponse.EventData("PATH_DECISION", 0, "בחר מסלול: אוטוסטרדה או דרך עפר");
            }
        } else {
            participant.setWrongCount(participant.getWrongCount() + 1);
            participant.setStreakCount(0);
            delta = scoringEngine.calculateWrongDelta(state.getCurrentPathChoice());
            if (isHighwayChallenge(state)) {
                delta -= 40;
            } else if (isDirtRoadChallenge(state)) {
                delta = -2;
            }
        }

        consumePathProgress(state);
        consumeTimedEffects(state);

        participant.setProgressPoints(Math.max(0, Math.min(1000, participant.getProgressPoints() + delta)));
        participant.setScoreTotal(Math.max(0, participant.getScoreTotal() + delta));
        participant.setLastAnswerAt(LocalDateTime.now());
        participant.setAvgResponseMs(calcNewAverage(participant.getAvgResponseMs(), request.responseTimeMs()));
        raceParticipantRepository.save(participant);

        question.setAnswered(true);
        question.setExpiredAt(LocalDateTime.now());
        generatedQuestionRepository.save(question);

        Answer answer = new Answer();
        answer.setRaceRoom(room);
        answer.setRaceParticipant(participant);
        answer.setQuestion(question);
        answer.setSubmittedAnswer(request.submittedAnswer());
        answer.setCorrect(isCorrect);
        answer.setResponseTimeMs(request.responseTimeMs());
        answer.setBasePoints(isCorrect ? 10 : 0);
        answer.setBonusPoints(Math.max(0, delta - 10));
        answer.setPenaltyPoints(delta < 0 ? Math.abs(delta) : 0);
        answer.setFinalDeltaPoints(delta);
        answerRepository.save(answer);

        List<LeaderboardEntry> leaderboard = buildLeaderboard(room);
        sseEventPublisher.publish(room.getRoomCode(), "position_update", Map.of("participantId", participantId, "progress", participant.getProgressPoints()));
        sseEventPublisher.publish(room.getRoomCode(), "leaderboard_update", Map.of("leaderboard", leaderboard));
        Integer oldRank = oldRankMap.get(participantId);
        Integer newRank = leaderboard.stream()
            .filter(e -> e.participantId().equals(participantId))
            .map(LeaderboardEntry::rank)
            .findFirst()
            .orElse(null);
        if (oldRank != null && newRank != null && newRank < oldRank) {
            sseEventPublisher.publish(room.getRoomCode(), "overtake", Map.of(
                "participantId", participantId,
                "displayName", participant.getStudent().getDisplayName(),
                "fromRank", oldRank,
                "toRank", newRank
            ));
        }
        if (eventData != null) {
            sseEventPublisher.publish(room.getRoomCode(), "game_event", Map.of(
                "participantId", participantId,
                "type", eventData.type(),
                "impact", eventData.impactPoints(),
                "message", eventData.message()
            ));
            if (eventData.impactPoints() > 0) {
                sseEventPublisher.publish(room.getRoomCode(), "bonus", Map.of(
                    "participantId", participantId,
                    "type", eventData.type(),
                    "impact", eventData.impactPoints(),
                    "message", eventData.message()
                ));
            }
        }
        if (streakMessage != null) {
            sseEventPublisher.publish(room.getRoomCode(), "game_event", Map.of(
                "participantId", participantId,
                "type", "STREAK",
                "impact", 0,
                "message", streakMessage
            ));
        }

        if (participant.getProgressPoints() >= 1000) {
            room.setWinnerParticipantId(participant.getId());
            room.setStatus(RaceRoomStatus.FINISHED);
            room.setFinishAt(LocalDateTime.now());
            raceRoomRepository.save(room);
            finalizeRace(room, participant);
        }

        return new SubmitAnswerResponse(
            isCorrect,
            delta,
            participant.getProgressPoints(),
            participant.getScoreTotal(),
            participant.getStreakCount(),
            eventData
        );
    }

    @Transactional
    public PathChoiceResponse choosePath(String roomCode, Long participantId, PathChoiceRequest request) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        if (room.getStatus() != RaceRoomStatus.RUNNING) {
            throw new ApiException("ROOM_NOT_RUNNING", "Race not running");
        }
        RaceParticipant participant = getParticipantOrThrow(participantId);
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room");
        }
        if (participant.getParticipantStatus() != ParticipantStatus.ACTIVE) {
            throw new ApiException("PARTICIPANT_NOT_APPROVED", "Participant is not approved");
        }
        RuntimeParticipantState state = sessionState(room.getId(), participantId);
        if (!state.isPendingPathDecision()) {
            throw new ApiException("NO_PENDING_PATH_DECISION", "No pending path decision");
        }
        state.setPendingPathDecision(false);
        state.setDecisionMeter(0);
        applyPathChoice(state, request.choice());

        DifficultyLevel nextDifficulty = request.choice() == PathChoice.HIGHWAY ? DifficultyLevel.HARD
            : request.choice() == PathChoice.DIRT_ROAD ? DifficultyLevel.EASY : DifficultyLevel.MEDIUM;
        double rewardMultiplier = request.choice() == PathChoice.HIGHWAY ? 3.0 : (request.choice() == PathChoice.DIRT_ROAD ? 1.2 : 1.0);
        double penaltyMultiplier = request.choice() == PathChoice.HIGHWAY ? 2.0 : 1.0;
        return new PathChoiceResponse(request.choice(), nextDifficulty, rewardMultiplier, penaltyMultiplier);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(String roomCode) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        return buildLeaderboard(room);
    }

    private RuntimeParticipantState sessionState(Long roomId, Long participantId) {
        GameSession session = sessions.computeIfAbsent(roomId, id -> {
            GameSession s = new GameSession();
            s.setRoomId(roomId);
            s.setStatus(RaceRoomStatus.RUNNING);
            return s;
        });
        return session.getParticipants().computeIfAbsent(participantId, id -> new RuntimeParticipantState());
    }

    private DifficultyLevel resolveDifficulty(RaceRoom room, Long participantId) {
        RuntimeParticipantState state = sessionState(room.getId(), participantId);
        if (state.getHintQuestionsRemaining() > 0) {
            return DifficultyLevel.EASY;
        }
        return switch (state.getCurrentPathChoice()) {
            case HIGHWAY -> DifficultyLevel.HARD;
            case DIRT_ROAD -> DifficultyLevel.EASY;
            default -> room.getInitialDifficulty();
        };
    }

    private RaceParticipant getParticipantOrThrow(Long participantId) {
        return raceParticipantRepository.findById(participantId)
            .orElseThrow(() -> new ApiException("PARTICIPANT_NOT_FOUND", "Participant not found"));
    }

    private Integer calcNewAverage(Integer oldAvg, int newVal) {
        if (oldAvg == null) {
            return newVal;
        }
        return (oldAvg + newVal) / 2;
    }

    private void applyPathChoice(RuntimeParticipantState state, PathChoice choice) {
        if (choice == PathChoice.HIGHWAY) {
            state.setCurrentPathChoice(PathChoice.HIGHWAY);
            state.setHighwayQuestionsRemaining(1);
            state.setDirtRoadQuestionsRemaining(0);
            return;
        }
        if (choice == PathChoice.DIRT_ROAD) {
            state.setCurrentPathChoice(PathChoice.DIRT_ROAD);
            state.setDirtRoadQuestionsRemaining(3);
            state.setHighwayQuestionsRemaining(0);
            return;
        }
        state.setCurrentPathChoice(PathChoice.NORMAL);
        state.setDirtRoadQuestionsRemaining(0);
        state.setHighwayQuestionsRemaining(0);
    }

    private boolean isHighwayChallenge(RuntimeParticipantState state) {
        return state.getCurrentPathChoice() == PathChoice.HIGHWAY && state.getHighwayQuestionsRemaining() > 0;
    }

    private boolean isDirtRoadChallenge(RuntimeParticipantState state) {
        return state.getCurrentPathChoice() == PathChoice.DIRT_ROAD && state.getDirtRoadQuestionsRemaining() > 0;
    }

    private boolean isPathChallengeActive(RuntimeParticipantState state) {
        return isHighwayChallenge(state) || isDirtRoadChallenge(state);
    }

    private void consumePathProgress(RuntimeParticipantState state) {
        if (state.getCurrentPathChoice() == PathChoice.HIGHWAY && state.getHighwayQuestionsRemaining() > 0) {
            state.setHighwayQuestionsRemaining(state.getHighwayQuestionsRemaining() - 1);
            if (state.getHighwayQuestionsRemaining() <= 0) {
                state.setCurrentPathChoice(PathChoice.NORMAL);
            }
            return;
        }
        if (state.getCurrentPathChoice() == PathChoice.DIRT_ROAD && state.getDirtRoadQuestionsRemaining() > 0) {
            state.setDirtRoadQuestionsRemaining(state.getDirtRoadQuestionsRemaining() - 1);
            if (state.getDirtRoadQuestionsRemaining() <= 0) {
                state.setCurrentPathChoice(PathChoice.NORMAL);
            }
        }
    }

    private void consumeTimedEffects(RuntimeParticipantState state) {
        if (state.getSlowdownQuestionsRemaining() > 0) {
            state.setSlowdownQuestionsRemaining(state.getSlowdownQuestionsRemaining() - 1);
        }
        if (state.getHintQuestionsRemaining() > 0) {
            state.setHintQuestionsRemaining(state.getHintQuestionsRemaining() - 1);
        }
    }

    private void applyLuckEffects(RuntimeParticipantState state, LuckEventEngine.LuckOutcome luckOutcome) {
        if (!luckOutcome.exists()) {
            return;
        }
        if (luckOutcome.type() == EventType.SLOWDOWN && luckOutcome.effectQuestions() > 0) {
            state.setSlowdownQuestionsRemaining(Math.max(state.getSlowdownQuestionsRemaining(), luckOutcome.effectQuestions()));
        }
        if (luckOutcome.type() == EventType.HINT && luckOutcome.effectQuestions() > 0) {
            state.setHintQuestionsRemaining(Math.max(state.getHintQuestionsRemaining(), luckOutcome.effectQuestions()));
        }
        if (luckOutcome.type() == EventType.SWAP_QUESTION) {
            state.setQuestionSwapAvailable(true);
        }
    }

    private List<LeaderboardEntry> buildLeaderboard(RaceRoom room) {
        List<RaceParticipant> participants = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room)
            .stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .toList();
        return IntStream.range(0, participants.size())
            .mapToObj(i -> {
                RaceParticipant p = participants.get(i);
                return new LeaderboardEntry(
                    p.getId(),
                    p.getStudent().getDisplayName(),
                    p.getProgressPoints(),
                    p.getScoreTotal(),
                    i + 1
                );
            })
            .toList();
    }

    private void finalizeRace(RaceRoom room, RaceParticipant winner) {
        List<RaceParticipant> ranking = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room)
            .stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .sorted(Comparator.comparingInt(RaceParticipant::getProgressPoints).reversed()
                .thenComparingInt(RaceParticipant::getScoreTotal).reversed())
            .toList();

        Map<Long, Integer> rankByParticipant = new HashMap<>();
        for (int i = 0; i < ranking.size(); i++) {
            rankByParticipant.put(ranking.get(i).getId(), i + 1);
        }

        for (RaceParticipant participant : ranking) {
            RaceResult result = new RaceResult();
            result.setRaceRoom(room);
            result.setRaceParticipant(participant);
            result.setFinalRank(rankByParticipant.get(participant.getId()));
            result.setFinalProgress(participant.getProgressPoints());
            result.setFinalScore(participant.getScoreTotal());
            int total = participant.getCorrectCount() + participant.getWrongCount();
            double accuracy = total == 0 ? 0.0 : ((double) participant.getCorrectCount() / total) * 100.0;
            result.setAccuracyPct(Math.round(accuracy * 100.0) / 100.0);
            result.setAvgResponseMs(participant.getAvgResponseMs());
            result.setTotalCorrect(participant.getCorrectCount());
            result.setTotalWrong(participant.getWrongCount());
            result.setTotalEvents(0);
            raceResultRepository.save(result);
        }

        String winnerName = winner == null ? "" : winner.getStudent().getDisplayName();
        Map<String, Object> payload = new HashMap<>();
        payload.put("winnerParticipantId", room.getWinnerParticipantId());
        payload.put("winnerName", winnerName);
        sseEventPublisher.publish(room.getRoomCode(), "race_finished", payload);
    }
}
