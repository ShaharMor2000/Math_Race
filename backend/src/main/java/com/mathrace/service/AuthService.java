package com.mathrace.service;

import com.mathrace.dto.auth.TeacherLoginRequest;
import com.mathrace.dto.auth.TeacherLoginResponse;
import com.mathrace.dto.auth.TeacherDirectPasswordResetRequest;
import com.mathrace.dto.auth.TeacherForgotPasswordRequest;
import com.mathrace.dto.auth.TeacherGoogleLoginRequest;
import com.mathrace.dto.auth.TeacherRegisterRequest;
import com.mathrace.dto.auth.TeacherResetPasswordRequest;
import com.mathrace.dto.auth.TeacherValidateResetTokenResponse;
import com.mathrace.entity.PasswordResetToken;
import com.mathrace.entity.Teacher;
import com.mathrace.exception.ApiException;
import com.mathrace.repository.PasswordResetTokenRepository;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TeacherRepository teacherRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;

    private final RestClient restClient = RestClient.builder().build();

    @Value("${app.auth.google-client-id:}")
    private String googleClientId;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public Long registerTeacher(TeacherRegisterRequest request) {
        String username = normalizeUsername(request.email());
        teacherRepository.findByEmail(username)
            .ifPresent(t -> {
                throw new ApiException("EMAIL_EXISTS", "המייל כבר קיים במערכת, נסי להתחבר.");
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
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND", "המשתמש לא נמצא"));

        if (!passwordEncoder.matches(request.password(), teacher.getPasswordHash())) {
            throw new ApiException("INVALID_PASSWORD", "הסיסמה שגויה");
        }

        teacher.setLastLoginAt(LocalDateTime.now());
        String token = jwtService.issueTeacherToken(teacher.getId(), teacher.getEmail());

        return new TeacherLoginResponse(
            token,
            new TeacherLoginResponse.TeacherProfile(teacher.getId(), teacher.getFullName(), teacher.getEmail())
        );
    }

    @Transactional
    public void verifyTeacherEmailForPasswordReset(TeacherForgotPasswordRequest request) {
        String email = normalizeUsername(request.email());
        Teacher teacher = teacherRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND", "המשתמש לא נמצא"));

        passwordResetTokenRepository.findByTeacherAndUsedAtIsNull(teacher)
            .forEach(token -> token.setUsedAt(LocalDateTime.now()));

        String rawToken = generateResetToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setTeacher(teacher);
        resetToken.setTokenHash(hashToken(rawToken));
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(resetToken);

        String resetLink = frontendBaseUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken;
        emailService.sendPasswordResetEmail(teacher.getEmail(), resetLink);
    }

    @Transactional(readOnly = true)
    public TeacherValidateResetTokenResponse validateResetToken(String rawToken) {
        PasswordResetToken resetToken = findValidResetToken(rawToken);
        return new TeacherValidateResetTokenResponse(true, resetToken.getTeacher().getEmail());
    }

    @Transactional
    public void resetTeacherPassword(TeacherResetPasswordRequest request) {
        PasswordResetToken resetToken = findValidResetToken(request.token());
        Teacher teacher = resetToken.getTeacher();
        teacher.setPasswordHash(passwordEncoder.encode(request.password()));
        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);
        teacherRepository.save(teacher);
    }

    @Transactional
    public void resetTeacherPasswordDirect(TeacherDirectPasswordResetRequest request) {
        String email = normalizeUsername(request.email());
        Teacher teacher = teacherRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND", "המשתמש לא נמצא"));
        teacher.setPasswordHash(passwordEncoder.encode(request.password()));
        teacherRepository.save(teacher);
    }

    @Transactional
    public TeacherLoginResponse loginTeacherWithGoogle(TeacherGoogleLoginRequest request) {
        JsonNode tokenInfo = verifyGoogleToken(request.idToken());
        if (tokenInfo.has("error")) {
            throw new ApiException(
                "GOOGLE_LOGIN_FAILED",
                tokenInfo.path("error_description").asText("Google token verification failed")
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
            throw new ApiException("GOOGLE_LOGIN_FAILED", "Google token does not include email");
        }
        if (!emailVerified) {
            throw new ApiException("GOOGLE_LOGIN_FAILED", "Google email is not verified");
        }
        if (googleClientId.isBlank()) {
            throw new ApiException("GOOGLE_LOGIN_NOT_CONFIGURED", "Google client ID is not configured on the server");
        }
        if (!googleClientId.equals(audience)) {
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

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private PasswordResetToken findValidResetToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException("INVALID_RESET_TOKEN", "קישור איפוס הסיסמה אינו תקין");
        }
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hashToken(rawToken))
            .orElseThrow(() -> new ApiException("INVALID_RESET_TOKEN", "קישור איפוס הסיסמה אינו תקין"));
        if (resetToken.isUsed()) {
            throw new ApiException("RESET_TOKEN_USED", "קישור איפוס הסיסמה כבר נוצל");
        }
        if (resetToken.isExpired()) {
            throw new ApiException("RESET_TOKEN_EXPIRED", "קישור איפוס הסיסמה פג תוקף");
        }
        return resetToken;
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
