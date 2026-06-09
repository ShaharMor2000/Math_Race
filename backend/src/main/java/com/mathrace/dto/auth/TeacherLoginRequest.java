package com.mathrace.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record TeacherLoginRequest(
    @NotBlank String email,
    @NotBlank String password
) {
}
