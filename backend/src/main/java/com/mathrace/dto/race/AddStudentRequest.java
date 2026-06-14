package com.mathrace.dto.race;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

public record AddStudentRequest(
    @NotBlank @Email String email
) {}
