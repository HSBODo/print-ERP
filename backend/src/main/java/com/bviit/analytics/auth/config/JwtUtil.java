package com.bviit.analytics.auth.config;

import com.bviit.analytics.auth.entity.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final int MIN_SECRET_LENGTH = 32;

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        String normalizedSecret = secret == null ? "" : secret.trim();
        if (normalizedSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "app.jwt.secret must be configured with at least %d characters.".formatted(MIN_SECRET_LENGTH)
            );
        }
        if (expirationMs <= 0) {
            throw new IllegalStateException("app.jwt.expiration-ms must be greater than zero.");
        }

        this.key = Keys.hmacShaKeyFor(normalizedSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String subject, Role role) {
        return Jwts.builder()
                .subject(subject)
                .claim("role", role.name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String getSubjectFromToken(String token) {
        String subject = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
        if (subject == null || subject.isBlank()) {
            throw new JwtException("JWT subject is missing");
        }
        return subject;
    }

    /** JWT의 role 클레임을 파싱. 없거나 잘못된 값이면 기본 USER 로 폴백(하위 호환). */
    public Role getRoleFromToken(String token) {
        Object claim = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role");
        if (claim == null) {
            return Role.USER;
        }
        try {
            return Role.valueOf(claim.toString());
        } catch (IllegalArgumentException e) {
            return Role.USER;
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
