package com.example.app.auth.dto;

import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 신규 사용자 생성 요청. 비밀번호는 최소 8자.
 */
public record UserCreateRequest(
        @NotBlank @Size(min = 2, max = 50) String loginId,
        @NotBlank @Email @Size(max = 200) String email,
        @NotBlank @Size(min = 1, max = 100) String name,
        @NotBlank @Size(min = 8, max = 200) String password,
        @NotNull Role role,
        @NotNull Department department
) {
}
