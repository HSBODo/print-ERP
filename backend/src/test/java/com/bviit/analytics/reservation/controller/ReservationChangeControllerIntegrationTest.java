package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 예약 변경이력 컨트롤러 HTTP 계약 회귀 방지.
 *
 * <p>대상:
 * <ul>
 *   <li>GET /api/reservation-change?from&to        — 변경 상세 (change_count ≥ 1 만)</li>
 *   <li>GET /api/reservation-change/daily?from&to  — 추이 달력 (일별 · 등록·예약일 축 병렬)</li>
 * </ul>
 *
 * <p>서비스·매칭·집계 로직은 {@link com.bviit.analytics.reservation.service.ReservationChangeChainBuilderTest}
 * 와 {@link com.bviit.analytics.batch.job.ReservationChangeMartWriterIT}(Testcontainers) 가 다룬다.
 * 여기서는 HTTP 계층(인증, 부서 gate, 범위 validation, 예외→상태코드)만 검증한다.
 *
 * <p>postgres-mart 프로파일 아니라 Reader 빈이 안 생겨 실제 응답은 503(StatsPanelSupport 규칙).
 * 부서 gate 통과 여부는 503 vs 403 로 구분 — 403 만 아니면 매처는 통과했다는 뜻.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reservation-change-controller-tests-123456",
        "spring.datasource.url=jdbc:h2:mem:reservation-change-controller-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class ReservationChangeControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    private String bearerMedicalStaff() {
        return "Bearer " + jwtUtil.generateToken("staff-med", Role.STAFF, Department.MEDICAL);
    }

    private String bearerMarketingStaff() {
        return "Bearer " + jwtUtil.generateToken("staff-mkt", Role.STAFF, Department.MARKETING);
    }

    private String bearerOverseasStaff() {
        return "Bearer " + jwtUtil.generateToken("staff-osm", Role.STAFF, Department.OVERSEAS_MARKETING);
    }

    private String bearerAdmin() {
        return "Bearer " + jwtUtil.generateToken("admin", Role.ADMIN, Department.ALL);
    }

    // ── 인증 ────────────────────────────────────────────────

    @Test
    void 미인증_상세는_401() throws Exception {
        mockMvc.perform(get("/api/reservation-change").param("from", "2026-01-01").param("to", "2026-01-31"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 미인증_추이달력은_401() throws Exception {
        mockMvc.perform(get("/api/reservation-change/daily").param("from", "2026-01-01").param("to", "2026-01-31"))
                .andExpect(status().isUnauthorized());
    }

    // ── 부서 gate ──────────────────────────────────────────
    // 예약 도메인은 MEDICAL 전용 (docs/auth/permissions.md § 4-1).
    // MARKETING/OVERSEAS_MARKETING 은 이 화면 접근 불가.

    @Test
    void MEDICAL_STAFF_는_상세_매처를_통과한다() throws Exception {
        // 503 등 응답 정상 · 403 아님만 확인 (마트 미연결 프로파일이라 실제 응답은 503).
        mockMvc.perform(get("/api/reservation-change").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerMedicalStaff()))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("MEDICAL STAFF 가 /api/reservation-change 에서 막힘");
                    }
                });
    }

    @Test
    void MEDICAL_STAFF_는_추이달력_매처를_통과한다() throws Exception {
        mockMvc.perform(get("/api/reservation-change/daily").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerMedicalStaff()))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("MEDICAL STAFF 가 /api/reservation-change/daily 에서 막힘");
                    }
                });
    }

    @Test
    void MARKETING_STAFF_는_상세가_403() throws Exception {
        mockMvc.perform(get("/api/reservation-change").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerMarketingStaff()))
                .andExpect(status().isForbidden());
    }

    @Test
    void OVERSEAS_MARKETING_STAFF_는_상세가_403() throws Exception {
        // 2026-09-11 신설 부서 — 홈 + 해외마케팅만 접근. 예약 변경이력은 MEDICAL 이라 403.
        mockMvc.perform(get("/api/reservation-change").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerOverseasStaff()))
                .andExpect(status().isForbidden());
    }

    @Test
    void ADMIN_은_부서_gate를_우회한다() throws Exception {
        mockMvc.perform(get("/api/reservation-change/daily").param("from", "2026-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerAdmin()))
                .andExpect(result -> {
                    if (result.getResponse().getStatus() == 403) {
                        throw new AssertionError("ADMIN 이 부서 gate 에서 막힘");
                    }
                });
    }

    // ── Validation ─────────────────────────────────────────

    @Test
    void from이_to보다_뒤면_400() throws Exception {
        mockMvc.perform(get("/api/reservation-change").param("from", "2026-02-01").param("to", "2026-01-01")
                        .header("Authorization", bearerMedicalStaff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 상세_범위가_10년_초과면_400() throws Exception {
        // MAX_RANGE_DAYS=3660 — 명단은 연도 전체(2022~) 조회 편의로 넓지만 상한은 있다.
        mockMvc.perform(get("/api/reservation-change").param("from", "2016-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerMedicalStaff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 추이달력_범위가_1년_초과면_400() throws Exception {
        // MAX_DAILY_RANGE_DAYS=366 — 달력은 최대 두 달 그리드만 조회하므로 이 상한을 넘으면 오사용.
        mockMvc.perform(get("/api/reservation-change/daily").param("from", "2024-01-01").param("to", "2026-01-31")
                        .header("Authorization", bearerMedicalStaff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 잘못된_날짜_형식은_400() throws Exception {
        mockMvc.perform(get("/api/reservation-change").param("from", "2026/01/01").param("to", "2026-01-31")
                        .header("Authorization", bearerMedicalStaff()))
                .andExpect(status().isBadRequest());
    }
}
