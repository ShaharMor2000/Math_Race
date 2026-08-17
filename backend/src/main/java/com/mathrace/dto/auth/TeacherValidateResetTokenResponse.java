package com.mathrace.dto.auth;

public record TeacherValidateResetTokenResponse(
    boolean valid,
    String email
) {
}
