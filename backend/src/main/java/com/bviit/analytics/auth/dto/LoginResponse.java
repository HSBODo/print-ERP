package com.bviit.analytics.auth.dto;

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
    }
}
