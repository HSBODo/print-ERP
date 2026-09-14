package com.bviit.analytics.auth.config;

import com.bviit.analytics.auth.entity.Department;
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

    /** 편의용 오버로드 — 부서를 지정하지 않으면 {@link Department#ALL} 로 발급된다 (테스트·시드용). */
    public String generateToken(String subject, Role role) {
        return generateToken(subject, role, Department.ALL);
    }

    public String generateToken(String subject, Role role, Department department) {
        return Jwts.builder()
                .subject(subject)
                .claim("role", role.name())
                .claim("dept", department.name())
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

    /**
     * JWT 의 role 클레임을 파싱. 알 수 없는 값이면 401 로 처리한다 —
     * 예전엔 조용히 {@code USER} 로 폴백했으나 4단 롤 도입 시 grace 없이 재로그인 강제
     * (docs/auth/permissions.md § 6-3).
     */
    public Role getRoleFromToken(String token) {
        Object claim = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role");
        if (claim == null) {
            throw new JwtException("JWT role claim is missing");
        }
        try {
            return Role.valueOf(claim.toString());
        } catch (IllegalArgumentException e) {
            throw new JwtException("JWT role claim is invalid: " + claim);
        }
    }

    /**
     * JWT 의 {@code dept} 클레임을 파싱. 알 수 없거나 없는 값이면 401 (docs/auth/permissions.md § 6-3).
     * 옛 토큰 (dept 클레임 없음) 은 여기서 예외 → 재로그인 유도.
     */
    public Department getDepartmentFromToken(String token) {
        Object claim = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)
                .getPayload()
                .get("dept");
        if (claim == null) {
            throw new JwtException("JWT dept claim is missing");
        }
        try {
            return Department.valueOf(claim.toString());
        } catch (IllegalArgumentException e) {
            throw new JwtException("JWT dept claim is invalid: " + claim);
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
