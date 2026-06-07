package com.mathrace.service;

import com.mathrace.security.AuthPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    @Value("${app.security.jwt-secret}")
    private String jwtSecret;

    @Value("${app.security.jwt-expiration-minutes:180}")
    private long expirationMinutes;

    public String issueTeacherToken(Long teacherId, String email) {
        return issueToken(Map.of("teacherId", teacherId, "email", email, "role", "TEACHER"));
    }

    public String issueStudentToken(Long participantId, Long roomId) {
        return issueToken(Map.of("participantId", participantId, "roomId", roomId, "role", "STUDENT"));
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public AuthPrincipal toPrincipal(Claims claims) {
        String role = claims.get("role", String.class);
        Long teacherId = toLong(claims.get("teacherId"));
        Long participantId = toLong(claims.get("participantId"));
        Long roomId = toLong(claims.get("roomId"));
        String email = claims.get("email", String.class);
        return new AuthPrincipal(role, teacherId, participantId, roomId, email);
    }

    private String issueToken(Map<String, Object> claims) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expirationMinutes * 60);
        return Jwts.builder()
            .claims(claims)
            .issuedAt(Date.from(now))
            .expiration(Date.from(exp))
            .signWith(secretKey())
            .compact();
    }

    private SecretKey secretKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }
}
