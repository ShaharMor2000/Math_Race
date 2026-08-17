package com.mathrace.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TeacherResetPasswordRequest(
    @NotBlank(message = "קישור איפוס לא תקין")
    String token,

    @NotBlank(message = "הסיסמה היא שדה חובה")
    @Size(min = 8, max = 72, message = "הסיסמה חייבת להכיל לפחות 8 תווים")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
        message = "הסיסמה חייבת להכיל אות גדולה, אות קטנה, מספר ותו מיוחד"
    )
    String password
) {
}
