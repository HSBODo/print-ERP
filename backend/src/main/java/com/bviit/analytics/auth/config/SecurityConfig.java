package com.bviit.analytics.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final List<String> allowedOrigins;
    private final boolean h2ConsoleEnabled;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler,
            @Value("${app.cors.allowed-origins:http://localhost:15173}") String allowedOrigins,
            @Value("${spring.h2.console.enabled:false}") boolean h2ConsoleEnabled
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
        this.h2ConsoleEnabled = h2ConsoleEnabled;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                auth.requestMatchers(
                        "/",
                        "/login",
                        "/stats/**",
                        "/admin/**",
                        "/report/**",
                        "/index.html",
                        "/assets/**",
                        "/favicon.ico",
                        "/favicon.svg",
                        "/robots.txt",
                        "/manifest.webmanifest",
                        "/site.webmanifest",
                        "/apple-touch-icon.png",
                        "/error"
                ).permitAll();
                auth.requestMatchers("/api/auth/**").permitAll();
                if (h2ConsoleEnabled) {
                    auth.requestMatchers("/h2-console/**").permitAll();
                }
                // 솔라피 웹훅 — 외부(솔라피 서버)가 JWT 없이 POST 로 결과를 던져 준다.
                // 인증 대체는 X-Solapi-Secret 헤더 서명 검증(SmsWebhookController).
                // 반드시 sms-management 매처보다 앞에 둔다 — 뒤에 두면 규칙이 뒤덮인다.
                auth.requestMatchers("/api/sms/webhook/**").permitAll();
                // ─── SMS 큐 상태·목록 조회는 MARKETING STAFF 개방 (docs/auth/permissions.md § 4-2) ───
                // 실행·재실행 (POST /run · /retry) 은 아래 /api/admin/** 매처가 ADMIN 으로 잡는다.
                // 이 GET 매처가 /api/admin/** 보다 반드시 앞에 와야 한다.
                auth.requestMatchers(HttpMethod.GET,
                                "/api/admin/batch/sms/queue/status",
                                "/api/admin/batch/sms/queue/rows",
                                "/api/admin/batch/sms/queue/statuses")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");

                // 관리자 전용 API (배치 트리거·로그·SMS 큐 실행/재실행) — ADMIN 롤 필수.
                // DIRECTOR 도 시스템 조작 불가 (docs/auth/permissions.md § 3).
                auth.requestMatchers("/api/admin/**").hasRole("ADMIN");

                // ─── SMS § 5-2 완화 (docs/auth/permissions.md § 4-2) ────────────
                // 조회·홀딩·수신거부·연락처 수정·수동 대상 추가 등은 STAFF 개방 (부서: MARKETING/ALL).
                // 오프셋 편집 · 실제 발송 · 대량 sync/import 만 ADMIN.
                // 좁은 매처가 먼저 와야 한다 — 뒤에 오는 광범위 매처를 덮지 못한다.
                auth.requestMatchers(HttpMethod.PUT, "/api/sms-management/offsets").hasRole("ADMIN");
                auth.requestMatchers(HttpMethod.POST, "/api/sms-management/send").hasRole("ADMIN");
                auth.requestMatchers(HttpMethod.POST, "/api/sms-management/sync").hasRole("ADMIN");
                auth.requestMatchers(HttpMethod.POST, "/api/sms-management/targets/import").hasRole("ADMIN");
                // 나머지 SMS 관리 API 는 MARKETING 부서 (문서 § 4-1 확정 · MEDICAL 은 접근 X).
                auth.requestMatchers("/api/sms-management/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");

                // ─── 부서 gate: MARKETING 전용 (§ 4-1) ──────────────────────────
                // 좁은 매처가 뒤의 광범위한 /api/stats/** MEDICAL 매처보다 먼저 와야 한다.
                auth.requestMatchers("/api/stats/reservation-channel/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");
                auth.requestMatchers("/api/stats/channel-profit/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");
                auth.requestMatchers("/api/stats/overseas/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");
                auth.requestMatchers("/api/stats/marketing/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");
                auth.requestMatchers("/api/accumulated-eyes/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");

                // ─── 부서 gate: MEDICAL 전용 (나머지 통계·리스트·리포트) ────────
                auth.requestMatchers("/api/stats/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/report/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/exam-list/**", "/api/cataract-exam-list/**",
                                "/api/all-exam-list/**", "/api/eoeis-checkup/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/surgery-list/**", "/api/reoperation-decisions/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/outpatient-list/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/reservation-list/**", "/api/reservation-list-homepage/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/dreamlens-ledger/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");

                auth.anyRequest().authenticated();
            })
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
