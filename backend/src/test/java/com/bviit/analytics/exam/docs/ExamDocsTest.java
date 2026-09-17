package com.bviit.analytics.exam.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.exam.dto.EoeisCheckupResult;
import com.bviit.analytics.exam.dto.EoeisCheckupRow;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.service.AllExamListReader;
import com.bviit.analytics.exam.service.CataractExamListReader;
import com.bviit.analytics.exam.service.EoeisCheckupService;
import com.bviit.analytics.exam.service.ExamCountReader;
import com.bviit.analytics.exam.service.ExamListReader;
import com.bviit.analytics.exam.service.ExaminationStatsReader;
import com.bviit.analytics.exam.service.ProcedureExamStatsReader;
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

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
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
 * exam 도메인 10개 엔드포인트 문서화 — 검사자 리스트 3종 + 아이리더 + 검사수 + Examination Panel/Stats + ProcedureExam.
 *
 * 모두 MEDICAL/ALL 부서. procedure-exam/monthly 는 홈 대시보드 개방(부서 무관).
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-exam-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:exam-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ExamDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ExamListReader examListReader;
    @MockitoBean AllExamListReader allExamListReader;
    @MockitoBean CataractExamListReader cataractExamListReader;
    @MockitoBean EoeisCheckupService eoeisCheckupService;
    @MockitoBean ExamCountReader examCountReader;
    @MockitoBean ExaminationStatsReader examinationStatsReader;
    @MockitoBean ProcedureExamStatsReader procedureExamStatsReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("chartNo", "C0000123");
        row.put("name", "홍길동");
        row.put("examDate", "2026-08-01");
        row.put("counselor", "BS0808");
        row.put("examKind", "M");
        row.put("stop", "N");
        row.put("visitReason", "직장인");
        when(examListReader.getExamList(anyString(), anyString())).thenReturn(List.of(row));
        when(allExamListReader.getAllExamList(anyString(), anyString())).thenReturn(List.of(row));
        when(cataractExamListReader.getCataractExamList(anyString(), anyString())).thenReturn(List.of(row));

        EoeisCheckupRow eoeisRow = new EoeisCheckupRow("김검사", "IOL-master", LocalDate.of(2026, 8, 14), 42L);
        when(eoeisCheckupService.getStats(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new EoeisCheckupResult(List.of(eoeisRow), Map.of("IOL-master", 300)));

        Map<String, Object> classRow = new LinkedHashMap<>();
        classRow.put("month", 7);
        classRow.put("motiveReport", "직장인");
        classRow.put("cnt", 120);
        when(examCountReader.getExamCountByClassMonthly(anyString(), anyString())).thenReturn(List.of(classRow));

        ExaminationMonthlyItem exam = ExaminationMonthlyItem.builder()
                .year(2026).month(7)
                .visionCorrection(320).dreamlens(14).cataract(85).examTotal(419).total(419)
                .build();
        when(examinationStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(exam));

        ProcedureExamMonthlyItem proc = ProcedureExamMonthlyItem.builder()
                .year(2026).month(7)
                .examCount(419).oneDayExamCount(35).total(419)
                .build();
        when(procedureExamStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(proc));
    }

    // ─── 리스트 3종 ───────────────────────────────────────────

    @Test
    void exam_list_문서화() throws Exception {
        docListEndpoint("/api/exam-list", "exam-list",
                "검사자 리스트 (상담사별)",
                "postgres-mart 프로파일에서 마트 조회. 최대 366일. 미연결 시 503.");
    }

    @Test
    void all_exam_list_문서화() throws Exception {
        docListEndpoint("/api/all-exam-list", "all-exam-list",
                "전체 검사자 리스트 (시력교정 + 백내장 통합)",
                "종합지표(overall-exam) 정합. postgres-mart 마트 조회. 최대 366일.");
    }

    @Test
    void cataract_exam_list_문서화() throws Exception {
        docListEndpoint("/api/cataract-exam-list", "cataract-exam-list",
                "백내장 검사자 리스트",
                "검사자 리스트와 동일 계약(camelCase). postgres-mart 마트 조회. 최대 366일.");
    }

    @Test
    void eoeis_checkup_문서화() throws Exception {
        mockMvc.perform(get("/api/eoeis-checkup")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("eoeis-checkup",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Exam")
                                .summary("아이리더 검사통계 (검사자×장비×일자)")
                                .description("피벗 화면 재료. 2026-07-01 이전은 400. 최대 366일. "
                                        + "EOEIS_DATASOURCE_URL 미설정 시 503. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("시작일 (YYYY-MM-DD, ≥ 2026-07-01)"),
                                        parameterWithName("to").description("종료일 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.rows[].operatorName").description("검사자 이름"),
                                        fieldWithPath("data.rows[].deviceName").description("장비 이름"),
                                        fieldWithPath("data.rows[].date").description("일자 YYYY-MM-DD"),
                                        fieldWithPath("data.rows[].count").description("건수 (long)"),
                                        subsectionWithPath("data.scores").description("팀 공용 장비 점수 맵 (장비명 → 점수)"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("EoeisCheckupResponse"))
                                .build())));
    }

    // ─── /api/stats/exam-count/by-class ────────────────────────

    @Test
    void exam_count_by_class_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/exam-count/by-class")
                        .param("year", "2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("exam-count-by-class",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Exam")
                                .summary("고객분류별 검사수 (월간 레포트 도표 #7)")
                                .description("세션 기준(EXAM 행 + Cataract_Exam 행) — 월 합계가 '검사수' 도표 라이브 구간과 일치. "
                                        + "24·25 는 분류 확정 전이라 레거시 확정값에 없음 — 당해연도만 조회. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(parameterWithName("year").description("조회 연도 (당해연도)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("월·모티브별 행 — {month, motiveReport, cnt}"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ExamCountByClassResponse"))
                                .build())));
    }

    // ─── /api/stats/examination/{kpi,trend,composition,monthly} ──

    @Test
    void examination_panel_kpi_문서화() throws Exception {
        docExaminationPanel("/kpi", "examination-panel-kpi",
                "시술별 검사 패널 KPI",
                "ExaminationPage KPI 카드. 응답은 examination/monthly 와 동일한 ExaminationMonthlyItem 배열.");
    }

    @Test
    void examination_panel_trend_문서화() throws Exception {
        docExaminationPanel("/trend", "examination-panel-trend",
                "시술별 검사 패널 월별 추이",
                "동일 스키마. MEDICAL/ALL.");
    }

    @Test
    void examination_panel_composition_문서화() throws Exception {
        docExaminationPanel("/composition", "examination-panel-composition",
                "시술별 검사 패널 구성",
                "동일 스키마. MEDICAL/ALL.");
    }

    @Test
    void examination_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/examination/monthly")
                        .param("years", "2024,2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("examination-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(examinationMonthlySnippet(
                                "검사 통계 — 월별 (시력교정·드림렌즈·백내장)",
                                "2024~2025 는 세부 카테고리에만 레거시 확정값 적용, examTotal 은 합산으로 산출. "
                                        + "이후는 EXAM 기준. total = examTotal (API 호환). MEDICAL/ALL. 미연결 시 503."))));
    }

    // ─── /api/stats/procedure-exam/monthly ─────────────────────

    @Test
    void procedure_exam_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/procedure-exam/monthly")
                        .param("years", "2024,2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("procedure-exam-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Exam")
                                .summary("검사수 (EXAM 행 + Cataract_Exam 세션 raw COUNT)")
                                .description("2024~2025 레거시 확정값, 2026~ prod DB. total = examCount (API 호환). "
                                        + "SecurityConfig 홈 예외 매처 — MEDICAL·MARKETING·OVERSEAS_MARKETING·ALL 부서 무관 열람. 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 무관 (홈 대시보드 개방)"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].examCount").description("검사수 (EXAM 행 + Cataract_Exam 세션 raw COUNT)"),
                                        fieldWithPath("data[].oneDayExamCount").description("원데이 검사 (EXAM 검사OP M/5 · 중단·취소 제외)"),
                                        fieldWithPath("data[].total").description("총합 (= examCount, API 호환)"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ProcedureExamMonthlyListResponse"))
                                .build())));
    }

    // ─── 공용 헬퍼 ────────────────────────────────────────────

    private void docListEndpoint(String path, String docId, String summary, String description) throws Exception {
        mockMvc.perform(get(path)
                        .param("from", "2026-08-01").param("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Exam")
                                .summary(summary).description(description)
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("검사일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("검사일 종료 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("검사자 행 배열 — camelCase 키의 동적 Map. 프론트 zod 스키마 참조."),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ExamListResponse"))
                                .build())));
    }

    private void docExaminationPanel(String pathSuffix, String docId, String summary, String description) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/stats/examination" + pathSuffix)
                .param("years", "2025,2026")
                .header(HttpHeaders.AUTHORIZATION, bearer());
        mockMvc.perform(req).andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(examinationMonthlySnippet(summary, description))));
    }

    private static ResourceSnippetParameters examinationMonthlySnippet(String summary, String description) {
        return ResourceSnippetParameters.builder()
                .tag("Exam")
                .summary(summary).description(description)
                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                .responseFields(
                        fieldWithPath("success").description("요청 성공 여부"),
                        fieldWithPath("data[].year").description("연도"),
                        fieldWithPath("data[].month").description("월"),
                        fieldWithPath("data[].visionCorrection").description("시력교정 검사자"),
                        fieldWithPath("data[].dreamlens").description("드림렌즈 (렌즈센터 D만 있고 검사 M 없는 행)"),
                        fieldWithPath("data[].cataract").description("백내장 검사 (2024~2025 레거시 확정값, 이후 추천 눈 단위)"),
                        fieldWithPath("data[].examTotal").description("'전체' 검사건수 = visionCorrection + dreamlens + cataract"),
                        fieldWithPath("data[].total").description("총합 (= examTotal, API 호환)"),
                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                .responseSchema(Schema.schema("ExaminationMonthlyListResponse"))
                .build();
    }
}
