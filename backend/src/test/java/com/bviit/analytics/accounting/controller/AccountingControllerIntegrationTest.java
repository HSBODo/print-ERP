package com.bviit.analytics.accounting.controller;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/accounting/** 보안 매처 — ADMIN 만 통과, 그 외 403, 미인증 401.
 * 기본 프로파일은 postgres-mart 가 아니라 마트 Reader 가 없으므로 ADMIN 은 503(데이터소스 없음) 이 정답이다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-accounting-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:accounting-ctrl;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class AccountingControllerIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JwtUtil jwtUtil;

    private String bearer(Role role, Department dept) {
        return "Bearer " + jwtUtil.generateToken("tester", role, dept);
    }

    @Test
    void 미인증이면_401() throws Exception {
        mockMvc.perform(get("/api/accounting/status"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ADMIN이_아니면_403() throws Exception {
        mockMvc.perform(get("/api/accounting/medical-receipts")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer(Role.MANAGER, Department.ALL)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/accounting/vision-receipts/monthly")
                        .param("years", "2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer(Role.STAFF, Department.MEDICAL)))
                .andExpect(status().isForbidden());
    }

    @Test
    void ADMIN은_매처를_통과하고_마트_미연결이라_503() throws Exception {
        mockMvc.perform(get("/api/accounting/medical-receipts/monthly")
                        .param("years", "2025,2026").param("category", "백내장")
                        .header(HttpHeaders.AUTHORIZATION, bearer(Role.ADMIN, Department.ALL)))
                .andExpect(status().isServiceUnavailable());
        mockMvc.perform(get("/api/accounting/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(Role.ADMIN, Department.ALL)))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void 기간이_뒤집히거나_366일을_넘으면_400() throws Exception {
        mockMvc.perform(get("/api/accounting/vision-receipts")
                        .param("from", "2026-07-31").param("to", "2026-07-01")
                        .header(HttpHeaders.AUTHORIZATION, bearer(Role.ADMIN, Department.ALL)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/accounting/medical-receipts")
                        .param("from", "2024-01-01").param("to", "2026-07-01")
                        .header(HttpHeaders.AUTHORIZATION, bearer(Role.ADMIN, Department.ALL)))
                .andExpect(status().isBadRequest());
    }
}
