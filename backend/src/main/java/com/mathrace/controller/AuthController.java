package com.mathrace.controller;

import com.mathrace.dto.auth.TeacherLoginRequest;
import com.mathrace.dto.auth.TeacherLoginResponse;
import com.mathrace.dto.auth.TeacherGoogleLoginRequest;
import com.mathrace.dto.auth.TeacherRegisterRequest;
import com.mathrace.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
