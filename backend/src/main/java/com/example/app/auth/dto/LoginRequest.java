package com.example.app.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Locale;

@Data
public class LoginRequest {

    @NotBlank
    private String loginId;

    @NotBlank
    private String password;

    public void setLoginId(String loginId) {
        this.loginId = loginId == null ? null : loginId.trim().toLowerCase(Locale.ROOT);
    }
}
