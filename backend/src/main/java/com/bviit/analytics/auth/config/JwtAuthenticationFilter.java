package com.bviit.analytics.auth.config;

import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * JWT 를 파싱해 SecurityContext 에 인증을 실는 필터.
 *
 * <p>4단 롤 + 부서 축 도입 이후:
 * <ul>
 *   <li>Role → {@code ROLE_XXX} authority (예: {@code ROLE_STAFF})</li>
 *   <li>Department → {@code DEPT_XXX} authority (예: {@code DEPT_MARKETING})</li>
 * </ul>
 * SecurityConfig 의 URL 매처가 {@code hasRole("ADMIN")} · {@code hasAnyAuthority("DEPT_MARKETING","DEPT_ALL")}
 * 로 판정. 옛 스키마 토큰(dept 클레임 없음) 은 {@link JwtUtil#getRoleFromToken}·
 * {@code getDept} 에서 어느 하나라도 예외를 던지면 필터가 조용히 인증을 스킵하고 {@code anyRequest().authenticated()} 로 401 처리된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring(7).trim();

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (token.isEmpty() || !jwtUtil.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        String subject;
        Role role;
        Department department;
        try {
            subject = jwtUtil.getSubjectFromToken(token);
            role = jwtUtil.getRoleFromToken(token);
            department = jwtUtil.getDepartmentFromToken(token);
        } catch (JwtException | IllegalArgumentException e) {
            // 옛 스키마 (role='USER' 등 · dept 없음) 는 여기서 잡혀 인증이 스킵된다 →
            // authenticated() 매처가 anyRequest 를 막아 401 → 프론트가 재로그인 유도.
            log.debug("JWT 인증 정보를 복원하지 못했습니다: {}", request.getRequestURI(), e);
            filterChain.doFilter(request, response);
            return;
        }

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(role.authority()));
        authorities.add(new SimpleGrantedAuthority("DEPT_" + department.name()));

        var authentication = new UsernamePasswordAuthenticationToken(subject, null, authorities);
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}
