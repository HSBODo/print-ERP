package com.bviit.analytics.auth.dto;

import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private UserDto user;

    @Data
    @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String loginId;
        private String email;
        private String name;
        private Role role;
        // ADMIN·DIRECTOR 는 Department.ALL. MANAGER·STAFF 는 MEDICAL 또는 MARKETING
        // (docs/auth/permissions.md § 2-3).
        private Department department;
    }
}
