package com.mathrace.security;

import com.mathrace.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;

public final class AuthSupport {

    private AuthSupport() {}

    public static AuthPrincipal requirePrincipal(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthFilter.AUTH_PRINCIPAL_ATTR);
        if (value instanceof AuthPrincipal principal) {
            return principal;
        }
        throw new ApiException("UNAUTHORIZED", "Valid authentication token required");
    }

    public static AuthPrincipal requireTeacher(HttpServletRequest request) {
        AuthPrincipal principal = requirePrincipal(request);
        if (!principal.isTeacher() || principal.teacherId() == null) {
            throw new ApiException("FORBIDDEN", "Teacher authentication required");
        }
        return principal;
    }

    public static AuthPrincipal requireStudent(HttpServletRequest request) {
        AuthPrincipal principal = requirePrincipal(request);
        if (!principal.isStudent() || principal.participantId() == null) {
            throw new ApiException("FORBIDDEN", "Student authentication required");
        }
        return principal;
    }
}
