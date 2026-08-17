package com.mathrace.controller;

import com.mathrace.dto.auth.TeacherLoginRequest;
import com.mathrace.dto.auth.TeacherLoginResponse;
import com.mathrace.dto.auth.TeacherDirectPasswordResetRequest;
import com.mathrace.dto.auth.TeacherForgotPasswordRequest;
import com.mathrace.dto.auth.TeacherGoogleLoginRequest;
import com.mathrace.dto.auth.TeacherRegisterRequest;
import com.mathrace.dto.auth.TeacherResetPasswordRequest;
import com.mathrace.dto.auth.TeacherValidateResetTokenResponse;
import com.mathrace.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/teacher")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@Valid @RequestBody TeacherRegisterRequest request) {
        Long teacherId = authService.registerTeacher(request);
        return Map.of("teacherId", teacherId, "email", request.email());
    }

    @PostMapping("/login")
    public TeacherLoginResponse login(@Valid @RequestBody TeacherLoginRequest request) {
        return authService.loginTeacher(request);
    }

    @PostMapping("/google")
    public TeacherLoginResponse loginWithGoogle(@Valid @RequestBody TeacherGoogleLoginRequest request) {
        return authService.loginTeacherWithGoogle(request);
    }

    @PostMapping("/forgot-password")
    public Map<String, Object> forgotPassword(@Valid @RequestBody TeacherForgotPasswordRequest request) {
        authService.verifyTeacherEmailForPasswordReset(request);
        return Map.of("message", "נשלח קישור לאיפוס סיסמה למייל שלך", "email", request.email());
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@Valid @RequestBody TeacherResetPasswordRequest request) {
        authService.resetTeacherPassword(request);
        return Map.of("message", "הסיסמה עודכנה בהצלחה");
    }

    @PostMapping("/reset-password/direct")
    public Map<String, Object> resetPasswordDirect(@Valid @RequestBody TeacherDirectPasswordResetRequest request) {
        authService.resetTeacherPasswordDirect(request);
        return Map.of("message", "הסיסמה עודכנה בהצלחה", "email", request.email());
    }

    @GetMapping("/reset-password/validate")
    public TeacherValidateResetTokenResponse validateResetToken(@RequestParam String token) {
        return authService.validateResetToken(token);
    }
}
