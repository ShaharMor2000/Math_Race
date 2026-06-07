package com.mathrace.security;

public record AuthPrincipal(String role, Long teacherId, Long participantId, Long roomId, String email) {
    public boolean isTeacher() {
        return "TEACHER".equals(role);
    }

    public boolean isStudent() {
        return "STUDENT".equals(role);
    }
}
