package com.bviit.analytics.auth;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

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

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Test
    void loginReturnsWrappedTokenAndUser() throws Exception {
        // 시드된 ADMIN 계정으로 로그인 — 응답에 role · department 가 실려야 한다
        // (docs/auth/permissions.md § 2-3 · § 5-1).
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("admin", "StrongTestPass123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.loginId").value("admin"))
                .andExpect(jsonPath("$.data.user.email").value("admin@bviit.com"))
                .andExpect(jsonPath("$.data.user.name").isNotEmpty())
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.user.department").value("ALL"));
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
    void spaAccountingRoutesArePublic() throws Exception {
        for (String path : new String[]{
                "/accounting/medical-receipts",
                "/accounting/vision-revenue",
                "/accounting/vision-revenue-summary",
                "/accounting/vision-revenue-chart",
                "/accounting/medical-revenue-chart"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk());
        }
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

    // ─── 4단 롤 + 부서 축 도입 (docs/auth/permissions.md § 2) 커버리지 ────────────

    @Test
    void staffMedicalTokenPassesAuthentication() throws Exception {
        // MEDICAL 부서 STAFF 는 통계 조회 인증을 통과해야 한다 (백엔드는 지금 부서 gate 없음).
        // 503 은 데이터 소스 부재 응답이라 정상 — 401/403 이 아님만 확인해 인증 통과를 증명.
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/stats/reservation/kpi").param("years", "2025")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void staffMarketingTokenIsForbiddenOnMedicalStatsApi() throws Exception {
        // X1-A 이후 백엔드에도 부서 gate. MARKETING STAFF 는 MEDICAL 통계 API 접근 시 403.
        // (docs/auth/permissions.md § 3 · § 4-1)
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(get("/api/stats/reservation/kpi").param("years", "2025")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffTokenIsForbiddenOnAdminApi() throws Exception {
        // STAFF 는 /api/admin/** 접근 금지 (docs/auth/permissions.md § 4-2).
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/admin/batch/history")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void directorTokenIsForbiddenOnAdminApi() throws Exception {
        // DIRECTOR 도 시스템 조작 불가 — 관리자 API 는 ADMIN 만 (docs/auth/permissions.md § 3).
        String token = jwtUtil.generateToken("director", Role.DIRECTOR, Department.ALL);
        mockMvc.perform(get("/api/admin/batch/history")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void legacyUserRoleTokenReturns401() throws Exception {
        // Role.USER 는 삭제된 값. 옛 토큰이 들어오면 JwtUtil.getRoleFromToken 이 JwtException 을 던져
        // JwtAuthenticationFilter 가 조용히 인증을 건너뛴다 → anyRequest().authenticated() 로 401 처리
        // (docs/auth/permissions.md § 6-3 grace 없음 원칙).
        String legacyToken = buildTokenWithClaims("admin", "USER", null);
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + legacyToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void unknownRoleTokenReturns401() throws Exception {
        // 그 외 알 수 없는 role 값도 grace 없이 401.
        String unknownRoleToken = buildTokenWithClaims("admin", "SUPERUSER", "ALL");
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + unknownRoleToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenWithoutDeptClaimReturns401() throws Exception {
        // 옛 스키마 (role 만 있고 dept 없음) 도 grace 없이 401.
        String noDept = buildTokenWithClaims("admin", "ADMIN", null);
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + noDept))
                .andExpect(status().isUnauthorized());
    }

    // ─── 백엔드 부서 gate (X1-A) ───────────────────────────────────────────

    @Test
    void medicalStaffCannotAccessMarketingOnlyApi() throws Exception {
        // /api/stats/reservation-channel/** 는 MARKETING/ALL 만 접근 가능 (문서 § 4-1).
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/stats/reservation-channel/anything")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingStaffCanAccessMarketingOnlyApi() throws Exception {
        // MARKETING STAFF 는 마케팅 API 인증 통과. 존재하지 않는 하위 path 라 404·503 등 응답
        // — 403(부서 gate) 이 아님만 확인.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(get("/api/stats/reservation-channel/anything")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 403) {
                        throw new AssertionError("403 forbidden — MARKETING STAFF 는 통과해야 한다");
                    }
                });
    }

    @Test
    void marketingStaffCannotAccessMedicalOnlyApi() throws Exception {
        // /api/exam-list/** 는 MEDICAL/ALL 만 접근 가능.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(get("/api/exam-list").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void medicalStaffCanAccessMedicalOnlyApi() throws Exception {
        // MEDICAL STAFF 는 MEDICAL 전용 API 인증 통과. 데이터 소스 부재로 503 이 정상.
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/exam-list").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 403) {
                        throw new AssertionError("403 forbidden — MEDICAL STAFF 는 통과해야 한다");
                    }
                });
    }

    @Test
    void directorPassesAllDepartmentGates() throws Exception {
        // DIRECTOR (department=ALL) 는 MARKETING·MEDICAL API 모두 부서 gate 통과.
        String token = jwtUtil.generateToken("director", Role.DIRECTOR, Department.ALL);

        mockMvc.perform(get("/api/stats/reservation-channel/anything")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("DIRECTOR 가 MARKETING 부서 gate 에서 막힘");
                    }
                });

        mockMvc.perform(get("/api/exam-list").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("DIRECTOR 가 MEDICAL 부서 gate 에서 막힘");
                    }
                });
    }

    // ─── SMS § 5-2 완화 (X1-B) ────────────────────────────────────────────

    @Test
    void marketingStaffCanReadSmsTargets() throws Exception {
        // SMS 조회는 MARKETING STAFF 개방 (완화). 503 등 응답 정상 · 403 아님.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(get("/api/sms-management/targets")
                        .param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 403) {
                        throw new AssertionError("SMS 조회가 MARKETING STAFF 에게 막힘 (§ 5-2 완화 위반)");
                    }
                });
    }

    @Test
    void medicalStaffCannotReadSmsTargets() throws Exception {
        // MEDICAL 부서는 SMS 관리 접근 불가 (완화 후에도).
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/sms-management/targets")
                        .param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingStaffCannotEditSmsOffsets() throws Exception {
        // 오프셋 편집(PUT /offsets) 은 ADMIN 만 (§ 2-1 · § 4-2).
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/sms-management/offsets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingStaffCannotTriggerSmsSend() throws Exception {
        // 실제 발송(POST /send) 도 ADMIN 만.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(post("/api/sms-management/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ─── SMS 큐 상태·목록 조회 부서 개방 (Q1 · docs/auth/permissions.md § 4-2) ───

    @Test
    void marketingStaffCanReadSmsQueueStatus() throws Exception {
        // MARKETING STAFF 가 SMS 페이지 진입 시 자동으로 조회되는 카드 데이터 (queue status/rows) 개방.
        // 매처가 403 이 아니면 통과 — 실제 응답은 postgres-mart 프로파일 아닐 때 404 등.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(get("/api/admin/batch/sms/queue/status")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("MARKETING STAFF 가 SMS 큐 상태 조회에서 막힘 (Q1 회귀)");
                    }
                });
    }

    @Test
    void medicalStaffCannotReadSmsQueueStatus() throws Exception {
        // MEDICAL STAFF 는 SMS 관리 전체에 접근 불가 — 큐 상태도 마찬가지 403.
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/admin/batch/sms/queue/status")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingStaffCannotTriggerSmsQueueRun() throws Exception {
        // 실행(POST /run) 은 ADMIN 만 — MARKETING STAFF 는 403.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(post("/api/admin/batch/sms/queue/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingStaffCannotTriggerSmsQueueRetry() throws Exception {
        // [실패·취소 재실행] 은 MANAGER 이상 — MARKETING STAFF 는 403 (STAFF 는 실무 판단 조작 불가).
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(post("/api/admin/batch/sms/queue/retry?ids=1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingManagerCanTriggerSmsQueueRetry() throws Exception {
        // 매니저 이상 완화 — MARKETING MANAGER 는 retry 매처 통과 (403 이 아님).
        // postgres-mart 프로파일 아니라 실제는 404 등이 나올 수 있으나 403 만 아니면 매처는 통과.
        String token = jwtUtil.generateToken("mgr-mkt", Role.MANAGER, Department.MARKETING);
        mockMvc.perform(post("/api/admin/batch/sms/queue/retry?ids=1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("MARKETING MANAGER 가 SMS retry 매처에서 막힘");
                    }
                });
    }

    @Test
    void medicalManagerCannotTriggerSmsQueueRetry() throws Exception {
        // 부서 gate 대칭 — MEDICAL MANAGER 는 SMS 페이지 접근 불가라 API 도 403.
        String token = jwtUtil.generateToken("mgr-med", Role.MANAGER, Department.MEDICAL);
        mockMvc.perform(post("/api/admin/batch/sms/queue/retry?ids=1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void directorCanTriggerSmsQueueRetry() throws Exception {
        // DIRECTOR (dept=ALL) 는 두 그룹 전부 열람 · STAFF 수준 조작만이지만 [실패·취소 재실행] 은 매니저 이상으로 완화됨.
        String token = jwtUtil.generateToken("director", Role.DIRECTOR, Department.ALL);
        mockMvc.perform(post("/api/admin/batch/sms/queue/retry?ids=1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("DIRECTOR 가 SMS retry 매처에서 막힘");
                    }
                });
    }

    // ─── 해외마케팅 (/api/overseas-marketing/**) 부서 gate ────────────────────

    @Test
    void marketingStaffCannotAccessOverseasMarketingApi() throws Exception {
        // 2026-09-17: 해외마케팅을 OVERSEAS_MARKETING 전담 부서로 좁혔다 — MARKETING 은 배제.
        // 국내 마케팅(MARKETING) 과 해외 프로모션 스코프 분리 (백엔드 SecurityConfig 매처와 대칭).
        // OVERSEAS_MARKETING STAFF 통과 검증은 아래 overseasMarketingStaffCanAccessOverseasMarketingApi 참조.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(get("/api/overseas-marketing/receptions")
                        .param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void medicalStaffCannotAccessOverseasMarketingApi() throws Exception {
        // 해외마케팅은 MEDICAL 부서 접근 X — 대칭 검증.
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(get("/api/overseas-marketing/receptions")
                        .param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void medicalStaffCannotWriteToOverseasMarketing() throws Exception {
        // 조회뿐 아니라 CRUD 도 부서 gate 로 차단 — 대칭 검증.
        String token = jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
        mockMvc.perform(post("/api/overseas-marketing/receptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"홍길동\"}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotAccessOverseasMarketingApi() throws Exception {
        // 토큰 없이 호출 시 401 — JwtAuthenticationFilter 통과 후 anyRequest().authenticated() 에서 걸린다.
        mockMvc.perform(get("/api/overseas-marketing/receptions")
                        .param("from", "2026-01-01").param("to", "2026-01-31"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void directorCanAccessOverseasMarketingApi() throws Exception {
        // DIRECTOR (dept=ALL) 는 부서 gate 통과.
        String token = jwtUtil.generateToken("director", Role.DIRECTOR, Department.ALL);
        mockMvc.perform(get("/api/overseas-marketing/receptions")
                        .param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("DIRECTOR 가 해외마케팅 부서 gate 에서 막힘");
                    }
                });
    }

    @Test
    void marketingStaffCannotTriggerOverseasSyncSheet() throws Exception {
        // 시트 동기화는 무거운 Google Sheets 조회 → ADMIN 만 실행.
        String token = jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
        mockMvc.perform(post("/api/overseas-marketing/sync-sheet")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void marketingManagerCannotTriggerOverseasSyncCrm() throws Exception {
        // CRM 매칭도 무거운 MSSQL 배치 → MANAGER 라도 실행 불가.
        String token = jwtUtil.generateToken("mgr-mkt", Role.MANAGER, Department.MARKETING);
        mockMvc.perform(post("/api/overseas-marketing/sync-crm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void directorCannotTriggerOverseasSyncCrm() throws Exception {
        // DIRECTOR 도 시스템 조작 불가 정책(§ 3)에 따라 sync 트리거 X.
        String token = jwtUtil.generateToken("director", Role.DIRECTOR, Department.ALL);
        mockMvc.perform(post("/api/overseas-marketing/sync-crm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ─── OVERSEAS_MARKETING 부서 (2026-09-11 신설) ───────────────────

    @Test
    void overseasMarketingStaffCanAccessOverseasMarketingApi() throws Exception {
        // OVERSEAS_MARKETING STAFF 는 해외마케팅 조회 API 통과 (자기 부서 개방).
        String token = jwtUtil.generateToken("staff-osm", Role.STAFF, Department.OVERSEAS_MARKETING);
        mockMvc.perform(get("/api/overseas-marketing/receptions")
                        .param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("OVERSEAS_MARKETING STAFF 가 해외마케팅 API 에서 막힘");
                    }
                });
    }

    @Test
    void overseasMarketingStaffCannotAccessMedicalOnlyApi() throws Exception {
        // 좁은 스코프 검증 — MEDICAL 전용 API 는 403.
        String token = jwtUtil.generateToken("staff-osm", Role.STAFF, Department.OVERSEAS_MARKETING);
        mockMvc.perform(get("/api/exam-list").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void overseasMarketingStaffCannotAccessMarketingOnlyApi() throws Exception {
        // 좁은 스코프 검증 — MARKETING 전용 API(reservation-channel·channel-profit·sms 등) 도 403.
        String token = jwtUtil.generateToken("staff-osm", Role.STAFF, Department.OVERSEAS_MARKETING);
        mockMvc.perform(get("/api/stats/reservation-channel/anything")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void overseasMarketingStaffCanReadHomeKpi() throws Exception {
        // 홈 대시보드 KPI 는 전 부서 개방 (OVERSEAS_MARKETING 도 접근).
        String token = jwtUtil.generateToken("staff-osm", Role.STAFF, Department.OVERSEAS_MARKETING);
        mockMvc.perform(get("/api/stats/reservation-overall/monthly").param("years", "2026")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("OVERSEAS_MARKETING STAFF 가 홈 KPI 에서 막힘");
                    }
                });
    }

    @Test
    void overseasMarketingStaffCannotTriggerOverseasSync() throws Exception {
        // sync 는 ADMIN 만 — OVERSEAS_MARKETING 도 트리거 불가.
        String token = jwtUtil.generateToken("staff-osm", Role.STAFF, Department.OVERSEAS_MARKETING);
        mockMvc.perform(post("/api/overseas-marketing/sync-crm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanTriggerOverseasSyncCrm() throws Exception {
        // ADMIN 만 sync-crm 매처 통과. postgres-mart 프로파일 아니라 실제는 503 등 응답 → 403 만 아니면 통과.
        String token = jwtUtil.generateToken("admin", Role.ADMIN, Department.ALL);
        mockMvc.perform(post("/api/overseas-marketing/sync-crm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("ADMIN 이 해외마케팅 sync-crm 매처에서 막힘");
                    }
                });
    }

    /**
     * 스키마 이전 (또는 잘못된) role 값을 임의로 담아 서명 유효한 JWT 를 생성한다.
     * JwtUtil.generateToken(Role) 은 enum 만 받아 옛 값을 못 만들므로 테스트 전용 로컬 빌더.
     */
    private String buildTokenWithClaims(String subject, String roleClaim, String deptClaim) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        var builder = Jwts.builder()
                .subject(subject)
                .claim("role", roleClaim)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key);
        if (deptClaim != null) {
            builder.claim("dept", deptClaim);
        }
        return builder.compact();
    }

    private record LoginPayload(String loginId, String password) {
    }
}
