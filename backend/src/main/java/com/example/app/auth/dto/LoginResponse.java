package com.example.app.auth.dto;

import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
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
        // ADMIN·DIRECTOR 는 Department.ALL. MANAGER·STAFF 는 그 외 부서.
        private Department department;
    }
}
