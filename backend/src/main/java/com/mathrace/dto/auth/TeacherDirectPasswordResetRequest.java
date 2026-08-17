package com.mathrace.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TeacherDirectPasswordResetRequest(
    @NotBlank(message = "אימייל הוא שדה חובה")
    @Email(message = "אימייל לא תקין")
    String email,

    @NotBlank(message = "הסיסמה היא שדה חובה")
    @Size(min = 8, max = 72, message = "הסיסמה חייבת להכיל לפחות 8 תווים")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
        message = "הסיסמה חייבת להכיל אות באנגלית, מספר ותו מיוחד"
    )
    String password
) {
}
