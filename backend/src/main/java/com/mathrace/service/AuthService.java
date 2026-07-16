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
        String username = normalizeUsername(request.email());
        teacherRepository.findByEmail(username)
            .ifPresent(t -> {
                throw new ApiException("USERNAME_EXISTS", "שם המשתמש כבר קיים");
            });

        Teacher teacher = new Teacher();
        teacher.setFullName(request.fullName());
        teacher.setEmail(username);
        teacher.setPasswordHash(passwordEncoder.encode(request.password()));
        teacherRepository.save(teacher);
        return teacher.getId();
    }

    @Transactional
    public TeacherLoginResponse loginTeacher(TeacherLoginRequest request) {
        String username = normalizeUsername(request.email());
        Teacher teacher = teacherRepository.findByEmail(username)
            .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS", "שם משתמש או סיסמה שגויים"));

        if (!passwordEncoder.matches(request.password(), teacher.getPasswordHash())) {
            throw new ApiException("INVALID_CREDENTIALS", "שם משתמש או סיסמה שגויים");
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
        if (tokenInfo.has("error")) {
            throw new ApiException(
                "GOOGLE_LOGIN_FAILED",
                tokenInfo.path("error_description").asText("אימות טוקן Google נכשל")
            );
        }

        String email = tokenInfo.path("email").asText("").toLowerCase(Locale.ROOT);
        String fullName = tokenInfo.path("name").asText("Google Teacher");
        JsonNode emailVerifiedNode = tokenInfo.path("email_verified");
        boolean emailVerified = emailVerifiedNode.isMissingNode()
            ? false
            : emailVerifiedNode.isBoolean()
                ? emailVerifiedNode.asBoolean()
                : "true".equalsIgnoreCase(emailVerifiedNode.asText("false"));
        String audience = tokenInfo.path("aud").asText("");

        if (email.isBlank()) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "טוקן Google אינו כולל אימייל");
        }
        if (!emailVerified) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "אימייל Google אינו מאומת");
        }
        if (googleClientId.isBlank()) {
            throw new ApiException("GOOGLE_LOGIN_NOT_CONFIGURED", "מזהה לקוח Google אינו מוגדר בשרת");
        }
        if (!googleClientId.equals(audience)) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "אי-התאמה בקהל של טוקן Google");
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
                throw new ApiException("GOOGLE_LOGIN_FAILED", "אימות טוקן Google נכשל");
            }
            return objectMapper.readTree(response);
        } catch (Exception ex) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "התחברות Google נכשלה");
        }
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }
}
