package com.bviit.analytics.auth.config;

import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.auth.entity.User;
import com.bviit.analytics.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {



    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;
    @Value("${app.seed.admin-login-id:admin}")
    private String adminLoginId;
    @Value("${app.seed.admin-email:admin@bviit.com}")
    private String adminEmail;
    @Value("${app.seed.admin-password:}")
    private String adminPassword;
    @Value("${app.seed.admin-name:관리자}")
    private String adminName;

    @Override
    public void run(String... args) {
        if (!seedEnabled || userRepository.count() > 0) {
            return;
        }

        String normalizedLoginId = requireText(normalizeLoginId(adminLoginId), "app.seed.admin-login-id");
        String normalizedEmail = requireText(normalizeEmail(adminEmail), "app.seed.admin-email");
        String normalizedName = requireText(adminName == null ? null : adminName.trim(), "app.seed.admin-name");
        String seedPassword = requireSecurePassword(adminPassword);

        userRepository.save(User.builder()
                .loginId(normalizedLoginId)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(seedPassword))
                .name(normalizedName)
                .role(Role.ADMIN)
                .build());
    }

    private String normalizeLoginId(String loginId) {
        return loginId == null ? null : loginId.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String requireText(String value, String propertyName) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(propertyName + " must be configured when app.seed.enabled=true.");
        }
        return value;
    }

    private String requireSecurePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "app.seed.admin-password must be configured when app.seed.enabled=true."
            );
        }
        return password.trim();
    }
}
