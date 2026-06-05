package com.mathrace.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record TeacherGoogleLoginRequest(
    @NotBlank String idToken
) {
}
