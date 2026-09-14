package com.bviit.analytics.auth.dto;

import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.auth.entity.User;

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
