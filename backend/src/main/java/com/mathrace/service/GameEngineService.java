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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
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

    private static final int PATH_DECISION_CHANCE_PERCENT = 12;
    private static final int DECISION_METER_PER_CORRECT = 22;
    private static final int DECISION_METER_THRESHOLD = 100;
    private static final int HIGHWAY_SUCCESS_BONUS = 150;
    private static final int HIGHWAY_FAILURE_PENALTY = 70;
    private static final int DIRT_ROAD_CORRECT_CAP = 14;

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
    private final DifficultyAdaptationService difficultyAdaptationService;
    private final RateLimitService rateLimitService;
    private final RuntimeStateService runtimeStateService;

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
            .forEach(p -> session.getParticipants().put(p.getId(), runtimeStateService.load(p)));
        sessions.put(room.getId(), session);
        sseEventPublisher.publish(room.getRoomCode(), "race_started", Map.of("status", "RUNNING"));
    }

    @Transactional
    public void pauseRace(String roomCode) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        if (room.getStatus() != RaceRoomStatus.RUNNING) {
            throw new ApiException("ROOM_NOT_RUNNING", "Race is not running");
        }
        room.setStatus(RaceRoomStatus.PAUSED);
        raceRoomRepository.save(room);
        sseEventPublisher.publish(room.getRoomCode(), "race_paused", Map.of("status", "PAUSED"));
    }

    @Transactional
    public void resumeRace(String roomCode) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        if (room.getStatus() != RaceRoomStatus.PAUSED) {
            throw new ApiException("ROOM_NOT_PAUSED", "Race is not paused");
        }
        room.setStatus(RaceRoomStatus.RUNNING);
        raceRoomRepository.save(room);
        sseEventPublisher.publish(room.getRoomCode(), "race_resumed", Map.of("status", "RUNNING"));
    }

    @Transactional
    public void endRace(String roomCode) {
        RaceRoom room = raceRoomService.endRace(roomCode);
        finalizeRace(room, null);
    }

    @Transactional
    public QuestionResponse nextQuestion(String roomCode, Long participantId) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantOrThrow(participantId);
        validateParticipantInRoom(participant, room);
        ensureRacePlayable(room);

        RuntimeParticipantState state = sessionState(room.getId(), participant);
        if (state.getFrozenQuestionsRemaining() > 0) {
            state.setFrozenQuestionsRemaining(state.getFrozenQuestionsRemaining() - 1);
            persistState(participant, state);
            throw new ApiException("VEHICLE_FROZEN", "הרכב נעצר לשאלה אחת אחרי כישלון באוטוסטרדה");
        }
        DifficultyLevel difficulty = resolveDifficulty(room, participant, state);
        boolean hintActive = state.getHintQuestionsRemaining() > 0;
        boolean reducedOptions = hintActive;

        QuestionResponse response = questionGeneratorService.generateNextQuestion(
            room,
            participant,
            difficulty,
            hintActive,
            reducedOptions
        );
        if (state.isQuestionSwapAvailable()) {
            response = new QuestionResponse(
                response.questionId(),
                response.difficulty(),
                response.questionText(),
                response.options(),
                response.maxTimeMs(),
                response.issuedAt(),
                response.hintActive(),
                response.reducedOptions(),
                true
            );
        }

        sseEventPublisher.publish(
            room.getRoomCode(),
            "question_ready",
            Map.of("participantId", participantId, "questionId", response.questionId()),
            participantId
        );
        return response;
    }

    @Transactional
    public QuestionResponse swapQuestion(String roomCode, Long participantId, Long questionId) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantOrThrow(participantId);
        validateParticipantInRoom(participant, room);
        ensureRacePlayable(room);

        GeneratedQuestion current = generatedQuestionRepository.findById(questionId)
            .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", "Question not found"));
        if (!current.getRaceParticipant().getId().equals(participantId)) {
            throw new ApiException("QUESTION_NOT_OWNED", "Question does not belong to participant");
        }
        if (current.isAnswered()) {
            throw new ApiException("QUESTION_ALREADY_ANSWERED", "Question already answered");
        }

        RuntimeParticipantState state = sessionState(room.getId(), participant);
        if (!state.isQuestionSwapAvailable()) {
            throw new ApiException("SWAP_NOT_AVAILABLE", "Question swap is not available");
        }

        current.setExpiredAt(LocalDateTime.now());
        generatedQuestionRepository.save(current);
        state.setQuestionSwapAvailable(false);
        persistState(participant, state);

        return nextQuestion(roomCode, participantId);
    }

    @Transactional
    public SubmitAnswerResponse submitAnswer(String roomCode, Long participantId, SubmitAnswerRequest request) {
        rateLimitService.checkAnswerRate(participantId);

        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantOrThrow(participantId);
        validateParticipantInRoom(participant, room);
        ensureRacePlayable(room);
        checkGlobalRaceTimeout(room);

        GeneratedQuestion question = generatedQuestionRepository.findById(request.questionId())
            .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", "Question not found"));
        if (question.isAnswered()) {
            throw new ApiException("QUESTION_ALREADY_ANSWERED", "Question already answered");
        }
        if (!question.getRaceParticipant().getId().equals(participantId)) {
            throw new ApiException("QUESTION_NOT_OWNED", "Question does not belong to participant");
        }

        List<RaceParticipant> rankingBeforeAnswer = activeParticipants(room);
        Map<Long, Integer> oldRankMap = new HashMap<>();
        for (int i = 0; i < rankingBeforeAnswer.size(); i++) {
            oldRankMap.put(rankingBeforeAnswer.get(i).getId(), i + 1);
        }

        int roomLeaderProgress = rankingBeforeAnswer.stream()
            .mapToInt(RaceParticipant::getProgressPoints)
            .max()
            .orElse(0);
        double avgProgress = rankingBeforeAnswer.stream()
            .mapToInt(RaceParticipant::getProgressPoints)
            .average()
            .orElse(0.0);

        RuntimeParticipantState state = sessionState(room.getId(), participant);
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

            LuckEventEngine.LuckOutcome luckOutcome = luckEventEngine.maybeTrigger(
                room, participant, state, roomLeaderProgress, avgProgress
            );
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
                delta += HIGHWAY_SUCCESS_BONUS;
            } else if (isDirtRoadChallenge(state)) {
                delta = Math.min(DIRT_ROAD_CORRECT_CAP, Math.max(8, (int) Math.round(delta * 0.55)));
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
            } else {
                eventData = maybeTriggerPathDecision(room, participant, state);
            }
        } else {
            participant.setWrongCount(participant.getWrongCount() + 1);
            participant.setStreakCount(0);
            delta = scoringEngine.calculateWrongDelta(state.getCurrentPathChoice());
            if (isHighwayChallenge(state)) {
                delta = -HIGHWAY_FAILURE_PENALTY;
                state.setFrozenQuestionsRemaining(1);
                publishStalledEvent(room, participant);
            }
        }

        consumePathProgress(state);
        consumeTimedEffects(state);

        participant.setProgressPoints(Math.max(0, Math.min(1000, participant.getProgressPoints() + delta)));
        participant.setScoreTotal(Math.max(0, participant.getScoreTotal() + delta));
        participant.setLastAnswerAt(LocalDateTime.now());
        participant.setAvgResponseMs(calcNewAverage(participant.getAvgResponseMs(), request.responseTimeMs()));
        raceParticipantRepository.save(participant);
        persistState(participant, state);

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
        sseEventPublisher.publish(room.getRoomCode(), "position_update", Map.of(
            "participantId", participantId,
            "progress", participant.getProgressPoints()
        ));
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
            ), participantId);
            if (eventData.impactPoints() > 0) {
                sseEventPublisher.publish(room.getRoomCode(), "bonus", Map.of(
                    "participantId", participantId,
                    "type", eventData.type(),
                    "impact", eventData.impactPoints(),
                    "message", eventData.message()
                ), participantId);
            }
        }
        if (streakMessage != null) {
            sseEventPublisher.publish(room.getRoomCode(), "game_event", Map.of(
                "participantId", participantId,
                "type", "STREAK",
                "impact", 0,
                "message", streakMessage
            ), participantId);
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
        ensureRacePlayable(room);
        RaceParticipant participant = getParticipantOrThrow(participantId);
        validateParticipantInRoom(participant, room);

        RuntimeParticipantState state = sessionState(room.getId(), participant);
        if (!state.isPendingPathDecision()) {
            throw new ApiException("NO_PENDING_PATH_DECISION", "No pending path decision");
        }
        state.setPendingPathDecision(false);
        state.setDecisionMeter(0);
        applyPathChoice(state, request.choice());
        persistState(participant, state);
        publishPathChoiceEvent(room, participant, request.choice());

        DifficultyLevel nextDifficulty = request.choice() == PathChoice.HIGHWAY ? DifficultyLevel.HARD
            : request.choice() == PathChoice.DIRT_ROAD ? DifficultyLevel.EASY : DifficultyLevel.MEDIUM;
        double rewardMultiplier = request.choice() == PathChoice.HIGHWAY ? 1.8 : (request.choice() == PathChoice.DIRT_ROAD ? 1.1 : 1.0);
        double penaltyMultiplier = request.choice() == PathChoice.HIGHWAY ? 1.2 : 1.0;
        return new PathChoiceResponse(request.choice(), nextDifficulty, rewardMultiplier, penaltyMultiplier);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(String roomCode) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        return buildLeaderboard(room);
    }

    private SubmitAnswerResponse.EventData maybeTriggerPathDecision(
        RaceRoom room,
        RaceParticipant participant,
        RuntimeParticipantState state
    ) {
        if (!room.isEnablePathChoice() || isPathChallengeActive(state) || state.isPendingPathDecision()) {
            return null;
        }

        state.setDecisionMeter(state.getDecisionMeter() + DECISION_METER_PER_CORRECT);
        boolean meterReady = state.getDecisionMeter() >= DECISION_METER_THRESHOLD;
        boolean randomReady = random.nextInt(100) < PATH_DECISION_CHANCE_PERCENT;
        if (!meterReady && !randomReady) {
            return null;
        }

        triggerPathDecision(room, participant, state);
        return new SubmitAnswerResponse.EventData("PATH_DECISION", 0, "בחר מסלול: אוטוסטרדה או דרך עפר");
    }

    private void triggerPathDecision(RaceRoom room, RaceParticipant participant, RuntimeParticipantState state) {
        state.setPendingPathDecision(true);
        state.setDecisionMeter(0);
        GameEvent event = new GameEvent();
        event.setRaceRoom(room);
        event.setRaceParticipant(participant);
        event.setEventType(EventType.PATH_DECISION);
        event.setPayloadJson("{\"message\":\"בחר מסלול: אוטוסטרדה או דרך עפר\"}");
        gameEventRepository.save(event);
    }

    private void publishPathChoiceEvent(RaceRoom room, RaceParticipant participant, PathChoice choice) {
        String displayName = participant.getStudent().getDisplayName();
        String pathLabel = switch (choice) {
            case HIGHWAY -> "אוטוסטרדה";
            case DIRT_ROAD -> "דרך עפר";
            default -> "מסלול רגיל";
        };
        String message = displayName + " בחר " + pathLabel;

        GameEvent event = new GameEvent();
        event.setRaceRoom(room);
        event.setRaceParticipant(participant);
        event.setEventType(EventType.PATH_CHOICE);
        event.setPayloadJson("{\"choice\":\"" + choice.name() + "\",\"message\":\"" + message + "\"}");
        gameEventRepository.save(event);

        sseEventPublisher.publish(room.getRoomCode(), "game_event", Map.of(
            "participantId", participant.getId(),
            "displayName", displayName,
            "type", "PATH_CHOICE",
            "impact", 0,
            "message", message
        ));
    }

    private void publishStalledEvent(RaceRoom room, RaceParticipant participant) {
        String displayName = participant.getStudent().getDisplayName();
        String message = displayName + " — סטול! הרכב נעצר אחרי כישלון באוטוסטרדה";

        GameEvent event = new GameEvent();
        event.setRaceRoom(room);
        event.setRaceParticipant(participant);
        event.setEventType(EventType.STALLED);
        event.setPayloadJson("{\"message\":\"" + message + "\"}");
        gameEventRepository.save(event);

        sseEventPublisher.publish(room.getRoomCode(), "game_event", Map.of(
            "participantId", participant.getId(),
            "displayName", displayName,
            "type", "STALLED",
            "impact", 0,
            "message", message
        ));
    }

    private boolean isHighwayChallenge(RuntimeParticipantState state) {
        return state.getCurrentPathChoice() == PathChoice.HIGHWAY && state.getHighwayQuestionsRemaining() > 0;
    }

    private boolean isDirtRoadChallenge(RuntimeParticipantState state) {
        return state.getCurrentPathChoice() == PathChoice.DIRT_ROAD && state.getDirtRoadQuestionsRemaining() > 0;
    }

    private RuntimeParticipantState sessionState(Long roomId, RaceParticipant participant) {
        GameSession session = sessions.computeIfAbsent(roomId, id -> {
            GameSession s = new GameSession();
            s.setRoomId(roomId);
            s.setStatus(RaceRoomStatus.RUNNING);
            return s;
        });
        return session.getParticipants().computeIfAbsent(participant.getId(), id -> runtimeStateService.load(participant));
    }

    private void persistState(RaceParticipant participant, RuntimeParticipantState state) {
        runtimeStateService.save(participant, state);
    }

    private DifficultyLevel resolveDifficulty(RaceRoom room, RaceParticipant participant, RuntimeParticipantState state) {
        if (state.getHintQuestionsRemaining() > 0) {
            return DifficultyLevel.EASY;
        }
        DifficultyLevel base = switch (state.getCurrentPathChoice()) {
            case HIGHWAY -> DifficultyLevel.HARD;
            case DIRT_ROAD -> DifficultyLevel.EASY;
            default -> room.getInitialDifficulty();
        };

        List<RaceParticipant> active = activeParticipants(room);
        int leader = active.stream().mapToInt(RaceParticipant::getProgressPoints).max().orElse(0);
        double avg = active.stream().mapToInt(RaceParticipant::getProgressPoints).average().orElse(0.0);
        return difficultyAdaptationService.adaptDifficulty(base, participant, leader, avg);
    }

    private RaceParticipant getParticipantOrThrow(Long participantId) {
        return raceParticipantRepository.findById(participantId)
            .orElseThrow(() -> new ApiException("PARTICIPANT_NOT_FOUND", "Participant not found"));
    }

    private void validateParticipantInRoom(RaceParticipant participant, RaceRoom room) {
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room");
        }
        if (participant.getParticipantStatus() != ParticipantStatus.ACTIVE) {
            throw new ApiException("PARTICIPANT_NOT_APPROVED", "Participant is not approved");
        }
    }

    private void ensureRacePlayable(RaceRoom room) {
        if (room.getStatus() != RaceRoomStatus.RUNNING) {
            throw new ApiException("ROOM_NOT_RUNNING", "Race not running");
        }
    }

    private void checkGlobalRaceTimeout(RaceRoom room) {
        if (room.getStartAt() == null || room.getRaceDurationMinutes() <= 0) {
            return;
        }
        long elapsedMinutes = Duration.between(room.getStartAt(), LocalDateTime.now()).toMinutes();
        if (elapsedMinutes >= room.getRaceDurationMinutes()) {
            room.setStatus(RaceRoomStatus.FINISHED);
            room.setFinishAt(LocalDateTime.now());
            raceRoomRepository.save(room);
            finalizeRace(room, null);
            throw new ApiException("RACE_TIMEOUT", "Race time is over");
        }
    }

    private List<RaceParticipant> activeParticipants(RaceRoom room) {
        return raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room).stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .toList();
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
        List<RaceParticipant> participants = activeParticipants(room);
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
        if (raceResultRepository.existsByRaceRoomId(room.getId())) {
            return;
        }

        List<RaceParticipant> ranking = activeParticipants(room).stream()
            .sorted(Comparator.comparingInt(RaceParticipant::getProgressPoints).reversed()
                .thenComparingInt(RaceParticipant::getScoreTotal).reversed())
            .toList();

        Map<Long, Integer> rankByParticipant = new HashMap<>();
        int currentRank = 0;
        RaceParticipant previous = null;
        for (int i = 0; i < ranking.size(); i++) {
            RaceParticipant participant = ranking.get(i);
            if (previous == null || !sameFinalResult(previous, participant)) {
                currentRank = i + 1;
            }
            rankByParticipant.put(participant.getId(), currentRank);
            previous = participant;
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
            result.setAccuracyPct(BigDecimal.valueOf(accuracy).setScale(2, RoundingMode.HALF_UP));
            result.setAvgResponseMs(participant.getAvgResponseMs());
            result.setTotalCorrect(participant.getCorrectCount());
            result.setTotalWrong(participant.getWrongCount());
            result.setTotalEvents((int) gameEventRepository.countByRaceParticipantId(participant.getId()));
            raceResultRepository.save(result);
        }

        String winnerName = winner == null ? resolveWinnerName(room, ranking) : winner.getStudent().getDisplayName();
        if (hasFirstPlaceTie(ranking)) {
            winnerName = "שוויון";
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("winnerParticipantId", room.getWinnerParticipantId());
        payload.put("winnerName", winnerName);
        sseEventPublisher.publish(room.getRoomCode(), "race_finished", payload);
    }

    private String resolveWinnerName(RaceRoom room, List<RaceParticipant> ranking) {
        if (room.getWinnerParticipantId() == null) {
            return ranking.isEmpty() ? "" : ranking.getFirst().getStudent().getDisplayName();
        }
        return ranking.stream()
            .filter(p -> p.getId().equals(room.getWinnerParticipantId()))
            .map(p -> p.getStudent().getDisplayName())
            .findFirst()
            .orElse("");
    }

    private boolean sameFinalResult(RaceParticipant a, RaceParticipant b) {
        return a.getProgressPoints() == b.getProgressPoints()
            && a.getScoreTotal() == b.getScoreTotal();
    }

    private boolean hasFirstPlaceTie(List<RaceParticipant> ranking) {
        return ranking.size() > 1 && sameFinalResult(ranking.get(0), ranking.get(1));
    }
}
