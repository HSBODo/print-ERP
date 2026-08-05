package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.surgery.repository.ReoperationDecisionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ReoperationDecisionController HTTP 계약 회귀 방지.
 *
 * 대상:
 *   GET /api/reoperation-decisions?from&to  — 저장 조회
 *   PUT /api/reoperation-decisions          — 배치 upsert
 *
 * 서비스·저장소 로직은 {@link com.bviit.analytics.surgery.service.ReoperationDecisionServiceTest}
 * 가 다룬다. 여기서는 HTTP 계층(인증, JSON 계약, Validation, 예외→상태코드)만 검증한다.
 *
 * 특히 boolean isReoperation JSON 키가 "reoperation" 으로 잘리던 버그(5f1c0c7)의
 * 회귀를 컨트롤러 레이어에서 다시 확인한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reoperation-controller-tests-123456",
        "spring.datasource.url=jdbc:h2:mem:reoperation-controller-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class ReoperationDecisionControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private ReoperationDecisionRepository repository;

    private String bearer;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        bearer = "Bearer " + jwtUtil.generateToken("tester", Role.ADMIN);
    }

    // ── 인증 ──────────────────────────────────────────────

    @Test
    void GET_은_인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/reoperation-decisions")
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-31"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void PUT_은_인증_없으면_401() throws Exception {
        mockMvc.perform(put("/api/reoperation-decisions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisions\":[]}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401));
    }

    // ── 저장 + 조회 성공 경로 ─────────────────────────────

    @Test
    void PUT_저장_응답에_isReoperation_필드가_잘리지_않고_그대로_나간다() throws Exception {
        // 5f1c0c7 회귀 방지 — 필드가 "reoperation" 로 잘리면 프론트 zod 스키마가 깨진다
        mockMvc.perform(put("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("12345", "2026-07-15", "remo", "", true, "재검토 결과 재수술")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].chartNo").value("12345"))
                .andExpect(jsonPath("$.data[0].opDate").value("2026-07-15"))
                .andExpect(jsonPath("$.data[0].againR").value("remo"))
                .andExpect(jsonPath("$.data[0].againL").value(""))
                .andExpect(jsonPath("$.data[0].isReoperation").value(true))
                .andExpect(jsonPath("$.data[0].memo").value("재검토 결과 재수술"))
                .andExpect(jsonPath("$.data[0].reoperation").doesNotExist())
                .andExpect(jsonPath("$.data[0].updatedBy").value("tester"));
    }

    @Test
    void GET_은_저장된_판정을_기간_필터로_조회한다() throws Exception {
        mockMvc.perform(put("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(
                                item("A", "2026-06-30", "", "", true, null),
                                item("B", "2026-07-15", "remo", "", true, null),
                                item("C", "2026-08-01", "", "", true, null)
                        )))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].chartNo").value("B"))
                .andExpect(jsonPath("$.data[0].isReoperation").value(true));
    }

    @Test
    void PUT_은_같은_키를_다시_저장하면_갱신한다() throws Exception {
        mockMvc.perform(put("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("12345", "2026-07-15", "remo", "", true, null)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("12345", "2026-07-15", "remo", "", false, "재검토 결과 재수술 아님")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].isReoperation").value(false))
                .andExpect(jsonPath("$.data[0].memo").value("재검토 결과 재수술 아님"));

        mockMvc.perform(get("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-31"))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].isReoperation").value(false));
    }

    // ── Validation ─────────────────────────────────────────

    @Test
    void PUT_빈_배열은_400() throws Exception {
        mockMvc.perform(put("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisions\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors.decisions").value(containsString("저장할 판정이 없습니다")));
    }

    @Test
    void PUT_필수필드_누락은_400() throws Exception {
        // opDate·againR·againL·isReoperation 모두 필수. chartNo 만 채워서 확인.
        mockMvc.perform(put("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisions\":[{\"chartNo\":\"12345\"}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void GET_시작일이_종료일보다_늦으면_400() throws Exception {
        // InvalidPeriodException → GlobalExceptionHandler 가 400 으로 매핑
        mockMvc.perform(get("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .param("from", "2026-07-31")
                        .param("to", "2026-07-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("늦을 수 없습니다")));
    }

    @Test
    void GET_구간이_366일을_넘으면_400() throws Exception {
        mockMvc.perform(get("/api/reoperation-decisions")
                        .header("Authorization", bearer)
                        .param("from", "2025-01-01")
                        .param("to", "2026-12-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("최대")));
    }

    // ── payload 헬퍼 ──────────────────────────────────────

    private String payload(String chartNo, String opDate, String againR, String againL,
                           boolean isReop, String memo) throws Exception {
        return payload(item(chartNo, opDate, againR, againL, isReop, memo));
    }

    private String payload(ObjectNode... items) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode arr = root.putArray("decisions");
        for (ObjectNode item : items) arr.add(item);
        return objectMapper.writeValueAsString(root);
    }

    private ObjectNode item(String chartNo, String opDate, String againR, String againL,
                            boolean isReop, String memo) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("chartNo", chartNo);
        node.put("opDate", opDate);
        node.put("againR", againR);
        node.put("againL", againL);
        node.put("isReoperation", isReop);
        if (memo != null) node.put("memo", memo);
        return node;
    }
}
