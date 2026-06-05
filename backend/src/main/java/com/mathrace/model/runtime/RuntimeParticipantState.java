package com.mathrace.model.runtime;

import com.mathrace.model.enums.PathChoice;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
public class RuntimeParticipantState {
    private PathChoice currentPathChoice = PathChoice.NORMAL;
    private boolean pendingPathDecision = false;
    private int decisionMeter = 0;
    private int highwayQuestionsRemaining = 0;
    private int dirtRoadQuestionsRemaining = 0;
    private int slowdownQuestionsRemaining = 0;
    private int hintQuestionsRemaining = 0;
    private boolean questionSwapAvailable = false;
    private int lastKnownRank = 0;
    private Set<String> activeEffects = new HashSet<>();
}
