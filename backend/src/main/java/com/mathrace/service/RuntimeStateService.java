package com.mathrace.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.model.enums.PathChoice;
import com.mathrace.model.runtime.RuntimeParticipantState;
import com.mathrace.repository.RaceParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RuntimeStateService {

    private final RaceParticipantRepository raceParticipantRepository;
    private final ObjectMapper objectMapper;

    public RuntimeParticipantState load(RaceParticipant participant) {
        if (participant.getRuntimeStateJson() == null || participant.getRuntimeStateJson().isBlank()) {
            return new RuntimeParticipantState();
        }
        try {
            RuntimeStateSnapshot snapshot = objectMapper.readValue(participant.getRuntimeStateJson(), RuntimeStateSnapshot.class);
            return snapshot.toState();
        } catch (JsonProcessingException e) {
            return new RuntimeParticipantState();
        }
    }

    public void save(RaceParticipant participant, RuntimeParticipantState state) {
        try {
            participant.setRuntimeStateJson(objectMapper.writeValueAsString(RuntimeStateSnapshot.from(state)));
            raceParticipantRepository.save(participant);
        } catch (JsonProcessingException ignored) {
            // Keep gameplay running even if serialization fails.
        }
    }

    private record RuntimeStateSnapshot(
        String currentPathChoice,
        boolean pendingPathDecision,
        int decisionMeter,
        int highwayQuestionsRemaining,
        int dirtRoadQuestionsRemaining,
        int slowdownQuestionsRemaining,
        int hintQuestionsRemaining,
        boolean questionSwapAvailable,
        int lastKnownRank
    ) {
        static RuntimeStateSnapshot from(RuntimeParticipantState state) {
            return new RuntimeStateSnapshot(
                state.getCurrentPathChoice().name(),
                state.isPendingPathDecision(),
                state.getDecisionMeter(),
                state.getHighwayQuestionsRemaining(),
                state.getDirtRoadQuestionsRemaining(),
                state.getSlowdownQuestionsRemaining(),
                state.getHintQuestionsRemaining(),
                state.isQuestionSwapAvailable(),
                state.getLastKnownRank()
            );
        }

        RuntimeParticipantState toState() {
            RuntimeParticipantState state = new RuntimeParticipantState();
            state.setCurrentPathChoice(currentPathChoice == null ? PathChoice.NORMAL : PathChoice.valueOf(currentPathChoice));
            state.setPendingPathDecision(pendingPathDecision);
            state.setDecisionMeter(decisionMeter);
            state.setHighwayQuestionsRemaining(highwayQuestionsRemaining);
            state.setDirtRoadQuestionsRemaining(dirtRoadQuestionsRemaining);
            state.setSlowdownQuestionsRemaining(slowdownQuestionsRemaining);
            state.setHintQuestionsRemaining(hintQuestionsRemaining);
            state.setQuestionSwapAvailable(questionSwapAvailable);
            state.setLastKnownRank(lastKnownRank);
            return state;
        }
    }
}
