package com.mathrace.dto.race;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddStudentRequest(
    @NotBlank @Size(max = 80) String displayName
) {}
