package com.example.app.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

/**
 * 보안 규칙.
 *
 * <ul>
 *   <li>{@code /api/**} — 인증 필수 (로그인·헬스체크 제외)</li>
 *   <li>{@code /api/admin/**} — ADMIN 롤 전용</li>
 *   <li>그 외 경로 — SPA 정적 자원·화면 라우트라 공개 (화면 권한은 프론트 라우트 가드가 판정)</li>
 * </ul>
 *
 * <p>권한 authority: 롤은 {@code ROLE_<ROLE>}, 부서는 {@code DEPT_<DEPARTMENT>} ({@link JwtAuthenticationFilter}).
 * 부서 전용 API 를 만들면 {@code /api/**} 매처보다 앞에 둔다. 예:
 * <pre>
 *   auth.requestMatchers("/api/team-a/**").hasAnyAuthority("DEPT_TEAM_A", "DEPT_ALL");
 * </pre>
 * 프론트 라우트의 {@code staticData.page.access} 와 대칭을 유지할 것.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler,
            @Value("${app.cors.allowed-origins:http://localhost:15173}") String allowedOrigins
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
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
                auth.requestMatchers("/api/auth/**").permitAll();
                // 헬스체크 — Docker HEALTHCHECK·LB·업타임 모니터가 인증 없이 호출.
                auth.requestMatchers(HttpMethod.GET, "/api/health").permitAll();

                // 관리자 전용 API — DIRECTOR 도 시스템 조작 불가.
                auth.requestMatchers("/api/admin/**").hasRole("ADMIN");

                // (부서 전용 API 매처는 여기에 — 클래스 Javadoc 예시 참고)

                auth.requestMatchers("/api/**").authenticated();
                // SPA 정적 자원·화면 라우트·Swagger UI(/docs) — 공개.
                auth.anyRequest().permitAll();
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
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
