package com.example.app.auth;

import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
import com.example.app.auth.entity.User;
import com.example.app.auth.repository.UserRepository;

/**
 * 테스트용 사용자 준비. JwtAuthenticationFilter 는 요청마다 DB 에서 사용자를 다시 조회하므로,
 * 토큰을 만들기 전에 그 loginId 의 사용자가 DB 에 있어야 인증이 된다.
 */
public final class TestUsers {

    private TestUsers() {
    }

    /** 없으면 만들고, 있으면 그대로 둔다. */
    public static User ensure(UserRepository repository, String loginId, Role role, Department department) {
        return repository.findByLoginIdIgnoreCase(loginId).orElseGet(() -> repository.save(User.builder()
                .loginId(loginId)
                .email(loginId + "@example.com")
                .password("{noop}unused")
                .name(loginId)
                .role(role)
                .department(department)
                .build()));
    }
}
