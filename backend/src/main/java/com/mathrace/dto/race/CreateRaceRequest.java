package com.mathrace.dto.race;

import com.mathrace.model.enums.DifficultyLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRaceRequest(
    @NotBlank @Size(max = 120) String title,
    @Size(max = 120) String className,
    @Min(1) @Max(8) int maxParticipants,
    @Min(5000) @Max(60000) int questionTimeMs,
    @NotNull DifficultyLevel initialDifficulty,
    boolean enableLuckEvents,
    boolean enablePathChoice
) {
}
