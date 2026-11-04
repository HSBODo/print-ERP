package com.example.app.auth.dto;

import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
import com.example.app.auth.entity.User;

/**
 * 계정 관리 목록·단일 조회 응답. 비밀번호는 절대 포함하지 않는다.
 */
public record UserRow(
        Long id,
        String loginId,
        String email,
        String name,
        Role role,
        Department department
) {
    public static UserRow from(User user) {
        return new UserRow(
                user.getId(),
                user.getLoginId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getDepartment()
        );
    }
}
