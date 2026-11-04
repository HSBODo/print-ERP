package com.example.app.auth;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
class TestProtectedController {

    @GetMapping("/api/test/protected")
    Map<String, String> protectedEndpoint(Authentication authentication) {
        return Map.of("loginId", authentication.getName());
    }
}
