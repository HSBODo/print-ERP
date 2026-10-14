package com.bviit.analytics.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * JPA Auditing 활성화 — {@link com.bviit.analytics.common.entity.BaseEntity} 의 created_by/at · updated_by/at 을 채운다.
 *
 * AnalyticsApplication 에 붙이지 않고 별도 설정으로 둔 이유: 메인 클래스에 붙이면
 * @WebMvcTest 슬라이스가 JPA 메타모델을 찾다가 기동에 실패한다.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    /** 배치·시더 등 로그인 컨텍스트가 없는 경로의 작성자 값. */
    public static final String SYSTEM_AUDITOR = "system";

    /** 로그인 ID (JWT subject = authentication.getName()). 비로그인·익명이면 {@link #SYSTEM_AUDITOR}. */
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .filter(auth -> !(auth instanceof AnonymousAuthenticationToken))
                .map(Authentication::getName)
                .or(() -> Optional.of(SYSTEM_AUDITOR));
    }
}
