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
        throw new ApiException("UNAUTHORIZED", "נדרש טוקן אימות תקף");
    }

    public static AuthPrincipal requireTeacher(HttpServletRequest request) {
        AuthPrincipal principal = requirePrincipal(request);
        if (!principal.isTeacher() || principal.teacherId() == null) {
            throw new ApiException("FORBIDDEN", "נדרשת התחברות מורה");
        }
        return principal;
    }

    public static AuthPrincipal requireStudent(HttpServletRequest request) {
        AuthPrincipal principal = requirePrincipal(request);
        if (!principal.isStudent() || principal.participantId() == null) {
            throw new ApiException("FORBIDDEN", "נדרשת התחברות תלמיד");
        }
        return principal;
    }
}
