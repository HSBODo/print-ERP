package com.bviit.analytics.reservation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.service.ReservationOverallStatsReader;
import com.bviit.analytics.reservation.service.ReservationStatsReader;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.subsectionWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/stats/reservation** · /api/stats/reservation-overall** 월별 시계열 5개 엔드포인트 문서화.
 *
 *   - ReservationStatsController      (1) : /api/stats/reservation/monthly
 *   - ReservationPanelController      (3) : /api/stats/reservation/{kpi,trend,composition}
 *   - ReservationOverallStatsController(1): /api/stats/reservation-overall/monthly
 *
 * 세 컨트롤러 모두 Optional&lt;Reader&gt; 로 감싸므로 @MockitoBean 만 주입하면 된다.
 * 미연결 시 503 은 StatsPanelSupport.require 가 처리 — 여기서는 성공 예시만 문서화한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reservation-monthly-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:reservation-monthly-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ReservationMonthlyDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ReservationStatsReader reservationStatsReader;
    @MockitoBean ReservationOverallStatsReader reservationOverallStatsReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubReaders() {
        when(reservationStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(
                ReservationMonthlyItem.builder()
                        .year(2026).month(7)
                        .surgery(180).outpatient(410).dreamlens(14).total(604)
                        .build()));

        when(reservationOverallStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(
                ReservationOverallMonthlyItem.builder()
                        .year(2026).month(7)
                        .reservations(2100).online(720).call(1380).total(2100)
                        .build()));
    }

    // ─── /api/stats/reservation/monthly ────────────────────────────

    @Test
    void reservation_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation/monthly")
                        .param("years", "2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(monthlyItemSnippet(
                                "예약 통계 — 월별 (ReservationPage 소스)",
                                "연도별 월간 수술/외래/드림렌즈. postgres-mart 프로파일에서는 마트를 조회한다. "
                                        + "미연결 시 503(StatsPanelSupport)."))));
    }

    // ─── /api/stats/reservation/{kpi,trend,composition} — 세 개 모두 같은 응답 ──

    @Test
    void reservation_panel_kpi_문서화() throws Exception {
        docPanelMonthly("/kpi", "reservation-panel-kpi",
                "예약 패널 KPI",
                "ReservationPage KPI 카드 계열. 응답은 monthly 와 동일한 배열. 미연결 시 503.");
    }

    @Test
    void reservation_panel_trend_문서화() throws Exception {
        docPanelMonthly("/trend", "reservation-panel-trend",
                "예약 패널 월별 추이",
                "ReservationPage 추이 차트. 응답은 monthly 와 동일한 배열. 미연결 시 503.");
    }

    @Test
    void reservation_panel_composition_문서화() throws Exception {
        docPanelMonthly("/composition", "reservation-panel-composition",
                "예약 패널 구성",
                "ReservationPage 구성 차트. 응답은 monthly 와 동일한 배열. 미연결 시 503.");
    }

    // ─── /api/stats/reservation-overall/monthly ─────────────────────

    @Test
    void reservation_overall_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-overall/monthly")
                        .param("years", "2024,2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-overall-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Reservation")
                                .summary("예약 종합 (콜+온라인) — 월별")
                                .description("BCRM 문의통계(RSS) 검사예약 종합. 24~25 는 확정값, 26~ 는 운영 DB 추정치. "
                                        + "카카오는 RESERVE_PATH 부재로 HappyTalk 별도 집계. "
                                        + "SecurityConfig 홈 예외 매처(부서 무관 열람) — MEDICAL·MARKETING·OVERSEAS_MARKETING·ALL 모두 접근 가능. "
                                        + "postgres-mart 프로파일에서 마트 조회, 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 무관 (홈 대시보드 개방)"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월 (1~12)"),
                                        fieldWithPath("data[].reservations").description("예약 종합 = 콜 + 온라인 (null 가능 — '알 수 없음')").optional()
                                                .type(org.springframework.restdocs.payload.JsonFieldType.NUMBER),
                                        fieldWithPath("data[].online").description("온라인 예약 (홈페이지·앱+네이버, 26~는 HappyTalk 카톡 합산)").optional()
                                                .type(org.springframework.restdocs.payload.JsonFieldType.NUMBER),
                                        fieldWithPath("data[].call").description("콜 예약 (인콜 CTI + 아웃콜 CRM)").optional()
                                                .type(org.springframework.restdocs.payload.JsonFieldType.NUMBER),
                                        fieldWithPath("data[].total").description("총합 (= reservations)").optional()
                                                .type(org.springframework.restdocs.payload.JsonFieldType.NUMBER),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationOverallMonthlyListResponse"))
                                .build())));
    }

    // ─── 공용 헬퍼 ──────────────────────────────────────────────────

    private void docPanelMonthly(String pathSuffix, String docId, String summary, String description) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/stats/reservation" + pathSuffix)
                .param("years", "2025,2026")
                .header(HttpHeaders.AUTHORIZATION, bearer());
        mockMvc.perform(req).andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(monthlyItemSnippet(summary, description))));
    }

    /** ReservationMonthlyItem 리스트 응답 공용 스니펫. reservation-monthly + panel 3종 모두 MEDICAL·ALL 부서 gate. */
    private static ResourceSnippetParameters monthlyItemSnippet(String summary, String description) {
        return ResourceSnippetParameters.builder()
                .tag("Reservation")
                .summary(summary)
                .description(description + " MEDICAL·ALL 부서.")
                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                .responseFields(
                        fieldWithPath("success").description("요청 성공 여부"),
                        fieldWithPath("data[].year").description("연도"),
                        fieldWithPath("data[].month").description("월 (1~12)"),
                        fieldWithPath("data[].surgery").description("수술 건수"),
                        fieldWithPath("data[].outpatient").description("외래 건수"),
                        fieldWithPath("data[].dreamlens").description("드림렌즈 건수"),
                        fieldWithPath("data[].total").description("총합 (surgery + outpatient + dreamlens)"),
                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                .responseSchema(Schema.schema("ReservationMonthlyListResponse"))
                .build();
    }
}
