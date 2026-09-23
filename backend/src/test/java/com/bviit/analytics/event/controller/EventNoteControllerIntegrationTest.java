package com.bviit.analytics.event.controller;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/event/notes — 권한(롤 × 부서) · 응답 계약 · 오류 코드.
 * 권한: GET = 로그인 사용자 전원 / POST·PUT·DELETE = ADMIN · MEDICAL · MARKETING (DIRECTOR·OVERSEAS_MARKETING 제외).
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-event-note-tests-123456",
        // 컨텍스트 간 인메모리 DB 공유로 인한 오염 방지 — 이 테스트 전용 DB
        "spring.datasource.url=jdbc:h2:mem:event-note-controller-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class EventNoteControllerIntegrationTest {

    private static final String BASE = "/api/event/notes";
    private static final String BODY = """
            {"eventDate":"2026-09-01","summary":"추석 프로모션","description":"본문"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    /* ── 조회: 로그인 사용자 전원 ── */

    @Test
    void 비로그인은_조회도_401이다() throws Exception {
        mockMvc.perform(get(BASE)).andExpect(status().isUnauthorized());
    }

    @Test
    void 해외마케팅_STAFF와_DIRECTOR도_조회는_된다() throws Exception {
        mockMvc.perform(as(get(BASE), token("os-staff", Role.STAFF, Department.OVERSEAS_MARKETING)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20));
        mockMvc.perform(as(get(BASE + "/all").param("from", "2026-09-01").param("to", "2026-09-30"),
                        token("director", Role.DIRECTOR, Department.ALL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    /* ── 쓰기: ADMIN · MEDICAL · MARKETING ── */

    @Test
    void MEDICAL_STAFF는_등록할_수_있고_작성자가_로그인ID로_남는다() throws Exception {
        mockMvc.perform(as(post(BASE).contentType(MediaType.APPLICATION_JSON).content(BODY),
                        token("staff-med", Role.STAFF, Department.MEDICAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.eventDate").value("2026-09-01"))
                .andExpect(jsonPath("$.data.createdBy").value("staff-med"))
                .andExpect(jsonPath("$.data.updatedBy").value("staff-med"));
    }

    @Test
    void MARKETING은_수정하고_ADMIN은_삭제할_수_있다() throws Exception {
        long id = createAsAdmin();

        mockMvc.perform(as(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                                .content("{\"eventDate\":\"2026-09-02\",\"summary\":\"수정됨\"}"),
                        token("mkt-manager", Role.MANAGER, Department.MARKETING)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary").value("수정됨"))
                .andExpect(jsonPath("$.data.createdBy").value("admin"))
                .andExpect(jsonPath("$.data.updatedBy").value("mkt-manager"));

        mockMvc.perform(as(delete(BASE + "/" + id), adminToken())).andExpect(status().isOk());
        mockMvc.perform(as(get(BASE + "/" + id), adminToken())).andExpect(status().isNotFound());
    }

    @Test
    void DIRECTOR와_해외마케팅은_쓰기가_403이다() throws Exception {
        long id = createAsAdmin();
        String director = token("director", Role.DIRECTOR, Department.ALL);
        String overseas = token("os-manager", Role.MANAGER, Department.OVERSEAS_MARKETING);

        for (String t : new String[]{director, overseas}) {
            mockMvc.perform(as(post(BASE).contentType(MediaType.APPLICATION_JSON).content(BODY), t))
                    .andExpect(status().isForbidden());
            mockMvc.perform(as(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(BODY), t))
                    .andExpect(status().isForbidden());
            mockMvc.perform(as(delete(BASE + "/" + id), t))
                    .andExpect(status().isForbidden());
        }
    }

    /* ── 응답·오류 계약 ── */

    @Test
    void all_경로는_id로_오매칭되지_않고_기간이_없으면_400이다() throws Exception {
        mockMvc.perform(as(get(BASE + "/all"), adminToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("조회 시작일과 종료일은 필수입니다."));
    }

    @Test
    void 기간_순서가_틀리면_400과_periodValid_필드_오류다() throws Exception {
        mockMvc.perform(as(post(BASE).contentType(MediaType.APPLICATION_JSON)
                                .content("{\"eventDate\":\"2026-09-01\",\"summary\":\"s\",\"startDate\":\"2026-09-05\"}"),
                        adminToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.periodValid").exists());
    }

    @Test
    void 없는_id는_404다() throws Exception {
        mockMvc.perform(as(get(BASE + "/999999"), adminToken()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    private long createAsAdmin() throws Exception {
        String json = mockMvc.perform(as(post(BASE).contentType(MediaType.APPLICATION_JSON).content(BODY), adminToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(json);
        return node.at("/data/id").asLong();
    }

    private String adminToken() {
        return token("admin", Role.ADMIN, Department.ALL);
    }

    private String token(String loginId, Role role, Department department) {
        return jwtUtil.generateToken(loginId, role, department);
    }

    private static MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder request, String token) {
        return request.header("Authorization", "Bearer " + token);
    }
}
