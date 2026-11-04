package com.example.app.auth.config;

import com.example.app.auth.entity.User;
import com.example.app.auth.repository.UserRepository;
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
import java.util.List;
import java.util.Optional;

/**
 * JWT 를 검증하고 SecurityContext 에 인증을 싣는 필터.
 *
 * <ul>
 *   <li>Role → {@code ROLE_XXX} authority (예: {@code ROLE_STAFF})</li>
 *   <li>Department → {@code DEPT_XXX} authority (예: {@code DEPT_TEAM_A})</li>
 * </ul>
 *
 * <p><b>권한은 토큰이 아니라 DB 의 현재 값으로 정한다.</b> 토큰은 "누구인지"만 증명하고,
 * 요청마다 사용자를 다시 조회한다 — 계정을 삭제하거나 롤·부서를 바꾸면 이미 발급된 토큰에도 즉시 반영된다
 * (삭제된 계정의 토큰 → 401, 강등된 관리자 → 403).
 *
 * <p>서명·만료·클레임 형식이 잘못된 토큰(옛 스키마 포함)은 인증을 건너뛰어
 * {@code /api/**} 의 {@code authenticated()} 매처에서 401 이 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader != null
                && authorizationHeader.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            resolveUser(authorizationHeader.substring(7).trim(), request)
                    .ifPresent(user -> authenticate(user, request));
        }

        filterChain.doFilter(request, response);
    }

    private Optional<User> resolveUser(String token, HttpServletRequest request) {
        if (token.isEmpty() || !jwtUtil.validateToken(token)) {
            return Optional.empty();
        }
        try {
            String subject = jwtUtil.getSubjectFromToken(token);
            // 클레임 형식 검증 — 알 수 없는 role·dept 를 가진 토큰은 grace 없이 거부한다.
            jwtUtil.getRoleFromToken(token);
            jwtUtil.getDepartmentFromToken(token);
            Optional<User> user = userRepository.findByLoginIdIgnoreCase(subject);
            if (user.isEmpty()) {
                log.debug("JWT 사용자가 존재하지 않습니다(삭제된 계정): {}", subject);
            }
            return user;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT 인증 정보를 복원하지 못했습니다: {}", request.getRequestURI(), e);
            return Optional.empty();
        }
    }

    private void authenticate(User user, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority(user.getRole().authority()),
                new SimpleGrantedAuthority("DEPT_" + user.getDepartment().name())
        );
        var authentication = new UsernamePasswordAuthenticationToken(user.getLoginId(), null, authorities);
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
