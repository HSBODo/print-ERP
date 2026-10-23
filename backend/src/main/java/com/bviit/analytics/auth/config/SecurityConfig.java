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
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
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
                        "/accounting/**",
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
                        "/error",
                        // API 문서 — Swagger UI 런처(index.html) + openapi3.yaml + swagger-ui-dist 웹자원.
                        // 결정 근거: docs/api-docs-strategy.md §3(공개) · §4(회계 5+로그인 1 시범).
                        "/docs/**",
                        "/webjars/**",
                        // 관리자 가이드(정적 기획서) — 브라우저 새 탭에서 열려 JWT 헤더 첨부 불가.
                        // 원본은 docs/_build_v2 (관리자 검토용). URL 은 사이드바 "관리자 → 가이드" 로만 노출.
                        "/guide/**"
                ).permitAll();
                auth.requestMatchers("/api/auth/**").permitAll();
                // 헬스체크 — Docker HEALTHCHECK·LB·업타임 모니터가 인증 없이 호출.
                auth.requestMatchers(HttpMethod.GET, "/api/health").permitAll();
                if (h2ConsoleEnabled) {
                    auth.requestMatchers("/h2-console/**").permitAll();
                }
                // 솔라피 웹훅 — 외부(솔라피 서버)가 JWT 없이 POST 로 결과를 던져 준다.
                // 인증 대체는 X-Solapi-Secret 헤더 서명 검증(SmsWebhookController).
                // 반드시 sms-management 매처보다 앞에 둔다 — 뒤에 두면 규칙이 뒤덮인다.
                auth.requestMatchers("/api/sms/webhook/**").permitAll();
                // ─── SMS 큐 상태·목록 조회는 MARKETING STAFF 개방 (docs/auth/permissions.md § 4-2) ───
                // 실행 (POST /run) 은 아래 /api/admin/** 매처가 ADMIN 으로 잡는다.
                // 이 GET 매처가 /api/admin/** 보다 반드시 앞에 와야 한다.
                auth.requestMatchers(HttpMethod.GET,
                                "/api/admin/batch/sms/queue/status",
                                "/api/admin/batch/sms/queue/rows",
                                "/api/admin/batch/sms/queue/statuses")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");
                // ─── [실패·취소 재실행] 은 MANAGER 이상 + MARKETING 부서 개방 ────────────
                // POST /queue/retry — attempt_count 리셋 후 PENDING 복귀. 실 발송 트리거 아님(폴러가 잡음).
                // 실무 판단(오래된 취소를 다시 보낼지)이 필요해 매니저 이상에게 상시 노출한다.
                // MEDICAL MANAGER 는 SMS 페이지 자체 접근 불가지만 API 직접 호출을 부서 gate 로 대칭 차단.
                // 반드시 /api/admin/** 매처보다 앞에 와야 한다.
                auth.requestMatchers(HttpMethod.POST, "/api/admin/batch/sms/queue/retry")
                        .access(new WebExpressionAuthorizationManager(
                                "(hasAuthority('DEPT_MARKETING') or hasAuthority('DEPT_ALL')) "
                                        + "and hasAnyRole('ADMIN','DIRECTOR','MANAGER')"));

                // 관리자 전용 API (배치 트리거·로그·SMS [지금 실행]) — ADMIN 롤 필수.
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
                // 해외마케팅 동기화 트리거 — ADMIN 만 실행. 무거운 외부 조회(Google Sheets·MSSQL SOFTCRM) 이 걸려
                // 실수 실행·오·남용을 방지한다. 반드시 아래 /api/overseas-marketing/** 부서 매처보다 앞에 둔다.
                auth.requestMatchers(HttpMethod.POST,
                                "/api/overseas-marketing/sync-sheet",
                                "/api/overseas-marketing/sync-crm")
                        .hasRole("ADMIN");
                // 해외마케팅(접수리스트·통계·예약통계) — OVERSEAS_MARKETING·ALL 개방 (2026-09-17 MARKETING 배제).
                // OVERSEAS_MARKETING 은 2026-09-11 신설 전담 부서 (홈 + 해외마케팅만 접근).
                // MARKETING 부서는 이 메뉴에서 배제 — 국내 마케팅과 해외 프로모션 스코프 분리.
                auth.requestMatchers("/api/overseas-marketing/**")
                        .hasAnyAuthority("DEPT_OVERSEAS_MARKETING", "DEPT_ALL");
                auth.requestMatchers("/api/stats/marketing/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");
                auth.requestMatchers("/api/accumulated-eyes/**")
                        .hasAnyAuthority("DEPT_MARKETING", "DEPT_ALL");

                // ─── 홈(대시보드) 요약 KPI — 전 부서 개방 (docs/auth/permissions.md § 5-1 "홈화면") ──
                // DashboardPage 가 부서 관계없이 뜨도록, 홈에서 쓰는 5개 GET 엔드포인트만
                // MEDICAL gate 앞에 예외 매처를 둔다. 집계 숫자라 개인정보 위험 낮음.
                // 하위 경로(/cell·/diagnostics/**)는 매칭되지 않아 MEDICAL 전용으로 유지된다.
                // 수술은 KPI·월별 추이·시술별 비중 세 화면이 모두 /panel/trend 하나를 공유한다.
                // OVERSEAS_MARKETING 은 홈만 접근 가능한 좁은 부서라 여기 포함 (2026-09-11).
                auth.requestMatchers(HttpMethod.GET,
                                "/api/stats/reservation-overall/monthly",
                                "/api/stats/procedure-exam/monthly",
                                "/api/stats/surgery/panel/trend",
                                "/api/stats/outpatient-count/monthly",
                                "/api/stats/reservation-stats-system")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_MARKETING", "DEPT_OVERSEAS_MARKETING", "DEPT_ALL");

                // ─── 부서 gate: MEDICAL 전용 (나머지 통계·리스트·리포트) ────────
                auth.requestMatchers("/api/stats/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/report/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/exam-list/**", "/api/cataract-exam-list/**",
                                "/api/all-exam-list/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/surgery-list/**", "/api/reoperation-decisions/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/outpatient-list/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/reservation-list/**", "/api/reservation-list-homepage/**",
                                "/api/reservation-change/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                auth.requestMatchers("/api/dreamlens-ledger/**")
                        .hasAnyAuthority("DEPT_MEDICAL", "DEPT_ALL");
                // 회계(진료 수납·시력교정 매출) — 임원(DIRECTOR) 이상 개방(2026-09-17).
                // 프런트 navigation.ts 의 EXECUTIVE_ONLY_PAGE_IDS 와 대칭. MANAGER·STAFF 는 차단.
                auth.requestMatchers("/api/accounting/**").hasAnyRole("ADMIN", "DIRECTOR");
                // 이벤트 노트(2026-09-23) — 조회는 차트 오버레이용이라 로그인 사용자 전원,
                // 등록·수정·삭제는 ADMIN + MEDICAL·MARKETING 부서. DIRECTOR(DEPT_ALL)는 "임원 열람·조작 X" 원칙대로 제외.
                // GET 매처가 반드시 먼저 와야 한다 — 순서가 바뀌면 조회까지 쓰기 권한으로 막힌다.
                auth.requestMatchers(HttpMethod.GET, "/api/event/**").authenticated();
                auth.requestMatchers("/api/event/**")
                        .hasAnyAuthority("ROLE_ADMIN", "DEPT_MEDICAL", "DEPT_MARKETING");

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
