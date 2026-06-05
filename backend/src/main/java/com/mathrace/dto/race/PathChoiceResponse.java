package com.mathrace.dto.race;

import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.model.enums.PathChoice;

public record PathChoiceResponse(
    PathChoice choice,
    DifficultyLevel nextQuestionDifficulty,
    double rewardMultiplier,
    double penaltyMultiplier
) {
}
