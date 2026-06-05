package com.mathrace.dto.race;

import com.mathrace.model.enums.PathChoice;
import jakarta.validation.constraints.NotNull;

public record PathChoiceRequest(
    @NotNull PathChoice choice
) {
}
