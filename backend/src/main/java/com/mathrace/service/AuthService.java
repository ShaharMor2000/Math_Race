package com.mathrace.service;

import com.mathrace.dto.auth.TeacherLoginRequest;
import com.mathrace.dto.auth.TeacherLoginResponse;
import com.mathrace.dto.auth.TeacherGoogleLoginRequest;
import com.mathrace.dto.auth.TeacherRegisterRequest;
import com.mathrace.entity.Teacher;
import com.mathrace.exception.ApiException;
import com.mathrace.repository.TeacherRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TeacherRepository teacherRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    private final RestClient restClient = RestClient.builder().build();

    @Value("${app.auth.google-client-id:}")
    private String googleClientId;

    @Transactional
    public Long registerTeacher(TeacherRegisterRequest request) {
        teacherRepository.findByEmail(request.email().toLowerCase())
            .ifPresent(t -> {
                throw new ApiException("EMAIL_EXISTS", "Email already exists");
            });

        Teacher teacher = new Teacher();
        teacher.setFullName(request.fullName());
        teacher.setEmail(request.email().toLowerCase());
        teacher.setPasswordHash(passwordEncoder.encode(request.password()));
        teacherRepository.save(teacher);
        return teacher.getId();
    }

    @Transactional
    public TeacherLoginResponse loginTeacher(TeacherLoginRequest request) {
        Teacher teacher = teacherRepository.findByEmail(request.email().toLowerCase())
            .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS", "Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), teacher.getPasswordHash())) {
            throw new ApiException("INVALID_CREDENTIALS", "Invalid email or password");
        }

        teacher.setLastLoginAt(LocalDateTime.now());
        String token = jwtService.issueTeacherToken(teacher.getId(), teacher.getEmail());

        return new TeacherLoginResponse(
            token,
            new TeacherLoginResponse.TeacherProfile(teacher.getId(), teacher.getFullName(), teacher.getEmail())
        );
    }

    @Transactional
    public TeacherLoginResponse loginTeacherWithGoogle(TeacherGoogleLoginRequest request) {
        JsonNode tokenInfo = verifyGoogleToken(request.idToken());
        String email = tokenInfo.path("email").asText("").toLowerCase(Locale.ROOT);
        String fullName = tokenInfo.path("name").asText("Google Teacher");
        String emailVerified = tokenInfo.path("email_verified").asText("false");
        String audience = tokenInfo.path("aud").asText("");

        if (email.isBlank()) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "Google token does not include email");
        }
        if (!"true".equalsIgnoreCase(emailVerified)) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "Google email is not verified");
        }
        if (!googleClientId.isBlank() && !googleClientId.equals(audience)) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "Google token audience mismatch");
        }

        Teacher teacher = teacherRepository.findByEmail(email).orElseGet(() -> {
            Teacher newTeacher = new Teacher();
            newTeacher.setEmail(email);
            newTeacher.setFullName(fullName);
            newTeacher.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            return teacherRepository.save(newTeacher);
        });

        if (teacher.getFullName() == null || teacher.getFullName().isBlank()) {
            teacher.setFullName(fullName);
        }
        teacher.setLastLoginAt(LocalDateTime.now());
        teacherRepository.save(teacher);

        String token = jwtService.issueTeacherToken(teacher.getId(), teacher.getEmail());
        return new TeacherLoginResponse(
            token,
            new TeacherLoginResponse.TeacherProfile(teacher.getId(), teacher.getFullName(), teacher.getEmail())
        );
    }

    private JsonNode verifyGoogleToken(String idToken) {
        try {
            String uri = UriComponentsBuilder
                .fromUriString("https://oauth2.googleapis.com/tokeninfo")
                .queryParam("id_token", idToken)
                .build(true)
                .toUriString();

            String response = restClient.get()
                .uri(uri)
                .retrieve()
                .body(String.class);
            if (response == null || response.isBlank()) {
                throw new ApiException("GOOGLE_LOGIN_FAILED", "Google token verification failed");
            }
            return objectMapper.readTree(response);
        } catch (Exception ex) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "Google login failed");
        }
    }
}
