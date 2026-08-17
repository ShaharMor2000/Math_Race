package com.mathrace.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TeacherForgotPasswordRequest(
    @NotBlank(message = "אימייל הוא שדה חובה")
    @Email(message = "אימייל לא תקין")
    String email
) {
}
