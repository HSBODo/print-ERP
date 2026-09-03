package com.bviit.analytics.auth.dto;

import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 사용자 편집 요청. 비밀번호는 null/빈 문자열이면 기존 값을 유지, 주면 최소 12자.
 * 롤·부서를 자기 자신의 계정에 변경하는 시도는 서비스에서 거절 (자충수 방지).
 */
public record UserUpdateRequest(
        @NotBlank @Email @Size(max = 200) String email,
        @NotBlank @Size(min = 1, max = 100) String name,
        @NotNull Role role,
        @NotNull Department department,
        @Size(min = 12, max = 200) String password
) {
    public boolean hasNewPassword() {
        return password != null && !password.isBlank();
    }
}
