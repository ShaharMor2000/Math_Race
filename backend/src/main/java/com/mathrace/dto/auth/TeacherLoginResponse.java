package com.mathrace.dto.auth;

public record TeacherLoginResponse(
    String accessToken,
    TeacherProfile teacher
) {
    public record TeacherProfile(Long id, String fullName, String email) {}
}
