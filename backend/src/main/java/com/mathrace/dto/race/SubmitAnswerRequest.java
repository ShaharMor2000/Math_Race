package com.mathrace.dto.race;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SubmitAnswerRequest(
    @NotNull Long questionId,
    @NotBlank String submittedAnswer,
    @Min(0) int responseTimeMs
) {
}
