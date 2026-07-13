package com.bviit.analytics.auth;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-integration-tests-123456",
        // 컨텍스트 간 인메모리 DB 공유로 인한 시드 오염 방지 — 이 테스트 전용 DB 사용
        "spring.datasource.url=jdbc:h2:mem:auth-integration-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=true",
        "app.seed.admin-login-id=admin",
        "app.seed.admin-email=admin@bviit.com",
        "app.seed.admin-password=StrongTestPass123!",
        "app.seed.admin-name=관리자",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class AuthSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    void loginReturnsWrappedTokenAndUser() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("admin", "StrongTestPass123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.loginId").value("admin"))
                .andExpect(jsonPath("$.data.user.email").value("admin@bviit.com"))
                .andExpect(jsonPath("$.data.user.name").isNotEmpty());
    }

    @Test
    void loginNormalizesLoginIdBeforeAuthentication() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("  ADMIN  ", "StrongTestPass123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.loginId").value("admin"));
    }

    @Test
    void loginReturns401ForWrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("admin", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("아이디 또는 비밀번호가 올바르지 않습니다."));
    }

    @Test
    void loginReturns400ForMalformedJson() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"admin\","))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("요청 본문을 읽을 수 없습니다."));
    }

    @Test
    void spaRootIsPublic() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk());
    }

    @Test
    void spaLoginRouteIsPublic() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk());
    }

    @Test
    void spaStatsRouteIsPublic() throws Exception {
        mockMvc.perform(get("/stats/reservation"))
                .andExpect(status().isOk());
    }

    @Test
    void statsApiRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/stats/reservation/kpi")
                        .param("years", "2025"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void statsApiAllowsAuthenticatedRequests() throws Exception {
        // 인증 통과 후 핸들러까지 도달했는지가 검증 목적. 이 테스트는 실 데이터 소스가 없어
        // 503(DataSourceUnavailable)이 정상 응답 — 401(미인증)이 아님을 확인함으로써 auth 통과를 증명.
        mockMvc.perform(get("/api/stats/reservation/kpi")
                        .param("years", "2025")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken("admin", Role.ADMIN)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(503));
    }

    @Test
    void h2ConsoleIsNotPublicWhenDisabled() throws Exception {
        mockMvc.perform(get("/h2-console"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/test/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns401ForBlankBearerToken() throws Exception {
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer   "))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns401ForInvalidToken() throws Exception {
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns200ForValidToken() throws Exception {
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken("admin", Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("admin"));
    }

    private record LoginPayload(String loginId, String password) {
    }
}
