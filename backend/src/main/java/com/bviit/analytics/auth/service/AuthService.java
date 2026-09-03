package com.bviit.analytics.auth.service;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.dto.LoginRequest;
import com.bviit.analytics.auth.dto.LoginResponse;
import com.bviit.analytics.auth.entity.User;
import com.bviit.analytics.common.exception.InvalidCredentialsException;
import com.bviit.analytics.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByLoginIdIgnoreCase(request.getLoginId())
                .orElseThrow(() -> {
                    log.warn("로그인 실패 — 존재하지 않는 아이디: {}", request.getLoginId());
                    return new InvalidCredentialsException("아이디 또는 비밀번호가 올바르지 않습니다.");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("로그인 실패 — 비밀번호 불일치: {}", request.getLoginId());
            throw new InvalidCredentialsException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtUtil.generateToken(user.getLoginId(), user.getRole(), user.getDepartment());

        return new LoginResponse(
                token,
                new LoginResponse.UserDto(
                        user.getId(),
                        user.getLoginId(),
                        user.getEmail(),
                        user.getName(),
                        user.getRole(),
                        user.getDepartment()
                )
        );
    }
}
