package com.bviit.analytics.consultation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.service.CataractReservationRateReader;
import com.bviit.analytics.consultation.service.ConsultationRateReader;
import com.bviit.analytics.consultation.service.StopReasonStatsReader;
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
import static org.mockito.ArgumentMatchers.anyString;
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
 * consultation 도메인 6개 엔드포인트 문서화 — 전환율(2) + 예약률(1) + 중단사유(1) + Panel 3.
 *
 * 모두 MEDICAL/ALL. consultation-rate 는 관리자 전용 페이지지만 API 자체는 MEDICAL 게이트.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-consultation-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:consultation-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ConsultationDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ConsultationRateReader consultationRateReader;
    @MockitoBean CataractReservationRateReader cataractReservationRateReader;
    @MockitoBean StopReasonStatsReader stopReasonStatsReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        ConsultationRateItem rate = ConsultationRateItem.builder()
                .year(2026).month(7)
                .visionExamCount(320).visionCounselCount(310)
                .visionSurgeryBooked(150).visionActualSurgery(140)
                .visionSurgeryRate(46.9).visionCounselRate(48.4)
                .visionCounselRateOneday(52.1).visionCounselRateGeneral(45.6).visionGeneralBookRate(42.1)
                .cataractExamCount(85).cataractSurgeryBooked(38).cataractStoppedCount(4).cataractSurgeryRate(44.7)
                .build();
        when(consultationRateReader.getMonthlyRates(anyList())).thenReturn(List.of(rate));

        CataractReservationRateItem cataract = CataractReservationRateItem.builder()
                .year(2026).month(7)
                .examCount(85).surgeryBookedCount(38).reservationRate(44.7)
                .build();
        when(cataractReservationRateReader.getMonthlyRates(anyList(), anyString())).thenReturn(List.of(cataract));

        StopReasonMonthlyItem stop = StopReasonMonthlyItem.builder()
                .year(2026).month(7)
                .recommendX(8).lensImpossible(3).keratoconus(1).avellino(0)
                .glaucoma(2).visionChange(4).other(12).total(30)
                .build();
        when(stopReasonStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(stop));
    }

    // ─── /api/stats/consultation-rate + panel 3 ─────────────

    @Test
    void consultation_rate_문서화() throws Exception {
        docConsultationRate("/api/stats/consultation-rate", "consultation-rate",
                "상담 전환율 (시력교정 + 백내장)",
                "시력교정 수술전환율 = 수술예약(FLAG=O) / 검사(FLAG=M). 백내장 수술전환율 = 백내장수술(FLAG=O,JINRYO=4) / 백내장검사(FLAG=H). "
                        + "postgres-mart 프로파일에서 마트 조회. MEDICAL/ALL. 미연결 시 503.");
    }

    @Test
    void consultation_rate_panel_kpi_문서화() throws Exception {
        docConsultationRate("/api/stats/consultation-rate/kpi", "consultation-rate-panel-kpi",
                "전환율 패널 KPI",
                "ConsultationRatePage KPI 카드. 응답은 consultation-rate 와 동일. MEDICAL/ALL.");
    }

    @Test
    void consultation_rate_panel_trend_문서화() throws Exception {
        docConsultationRate("/api/stats/consultation-rate/trend", "consultation-rate-panel-trend",
                "전환율 패널 추이", "동일 스키마. MEDICAL/ALL.");
    }

    @Test
    void consultation_rate_panel_composition_문서화() throws Exception {
        docConsultationRate("/api/stats/consultation-rate/composition", "consultation-rate-panel-composition",
                "전환율 패널 구성", "동일 스키마. MEDICAL/ALL.");
    }

    // ─── /api/stats/cataract-reservation-rate/trend ────────

    @Test
    void cataract_reservation_rate_trend_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/cataract-reservation-rate/trend")
                        .param("years", "2025,2026").param("category", "cataract")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-reservation-rate-trend",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Consultation")
                                .summary("예약률 월별 추이")
                                .description("examCount = 백내장 검사건수와 동일한 Cataract_Exam 추천 눈(안) 수. "
                                        + "surgeryBookedCount = 위 검사건수 안에서 수술예약(RESERVATION O) 있는 수. "
                                        + "reservationRate = surgeryBookedCount / examCount × 100. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("years").description("조회 연도 목록 (콤마 구분)"),
                                        parameterWithName("category").description("계열 — cataract(기본) · vision").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].examCount").description("검사건수 (분모)"),
                                        fieldWithPath("data[].surgeryBookedCount").description("수술예약 있는 수 (분자)"),
                                        fieldWithPath("data[].reservationRate").description("예약률 (%, 소수점 있음)"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("CataractReservationRateListResponse"))
                                .build())));
    }

    // ─── /api/stats/stop-reason/monthly ────────────────────

    @Test
    void stop_reason_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/stop-reason/monthly")
                        .param("years", "2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("stop-reason-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Consultation")
                                .summary("검사 중단 사유 — 월별")
                                .description("EXAM.STOP_YN='Y' 를 EXAM_MEMO 키워드로 자동 분류. ⚠️ 사유 코드가 DB 에 없어 자유텍스트 매칭 — 직원 수동분류와 다를 수 있다. "
                                        + "잠정 중단(other/glaucoma/visionChange) vs 수술 불가(recommendX/lensImpossible/keratoconus/avellino). "
                                        + "total = 모든 사유 합 = EXAM.STOP_YN='Y' 월별 건수. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].recommendX").description("수술권유X (수술 불가)"),
                                        fieldWithPath("data[].lensImpossible").description("렌즈삽입불가 (수술 불가)"),
                                        fieldWithPath("data[].keratoconus").description("원추각막 (수술 불가)"),
                                        fieldWithPath("data[].avellino").description("아벨리노 (수술 불가)"),
                                        fieldWithPath("data[].glaucoma").description("녹내장 (잠정 중단)"),
                                        fieldWithPath("data[].visionChange").description("시력변화 (잠정 중단)"),
                                        fieldWithPath("data[].other").description("기타 (잠정 중단)"),
                                        fieldWithPath("data[].total").description("합계 (= 월별 STOP_YN='Y')"))
                                .responseSchema(Schema.schema("StopReasonMonthlyListResponse"))
                                .build())));
    }

    // ─── 공용 헬퍼 ────────────────────────────────────────

    private void docConsultationRate(String path, String docId, String summary, String description) throws Exception {
        MockHttpServletRequestBuilder req = get(path)
                .param("years", "2025,2026")
                .header(HttpHeaders.AUTHORIZATION, bearer());
        mockMvc.perform(req).andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Consultation")
                                .summary(summary).description(description)
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].visionExamCount").description("시력교정 검사자수 (EXAM · CANCEL_CD 빈값)"),
                                        fieldWithPath("data[].visionCounselCount").description("시력교정 상담수 (STOP_YN<>Y AND BS지시 있음)"),
                                        fieldWithPath("data[].visionSurgeryBooked").description("시력교정 수술예약 존재 수 (FLAG=O)"),
                                        fieldWithPath("data[].visionActualSurgery").description("시력교정 실제 수술 완료 수 (OPERATIONDATA)"),
                                        fieldWithPath("data[].visionSurgeryRate").description("시력교정 수술전환율 (%) = surgeryBooked / examCount × 100"),
                                        fieldWithPath("data[].visionCounselRate").description("시력교정 상담전환율 (%) = surgeryBooked / counselCount × 100"),
                                        fieldWithPath("data[].visionCounselRateOneday").description("원데이 상담성공률 (#21 3라인)"),
                                        fieldWithPath("data[].visionCounselRateGeneral").description("일반 상담성공률 (#21 3라인)"),
                                        fieldWithPath("data[].visionGeneralBookRate").description("일반 예약률 (#19) = bookedGeneral / examGeneral"),
                                        fieldWithPath("data[].cataractExamCount").description("백내장 검사자수 (DISTINCT CUST_NUM)"),
                                        fieldWithPath("data[].cataractSurgeryBooked").description("백내장 수술예약 존재 수 (FLAG=O, JINRYO=4)"),
                                        fieldWithPath("data[].cataractStoppedCount").description("백내장 중단 수 (MY_optometrist 있음 · MY_COUNSELOR='BS0808')"),
                                        fieldWithPath("data[].cataractSurgeryRate").description("백내장 수술전환율 (%) = surgeryBooked / examCount × 100"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ConsultationRateListResponse"))
                                .build())));
    }
}
