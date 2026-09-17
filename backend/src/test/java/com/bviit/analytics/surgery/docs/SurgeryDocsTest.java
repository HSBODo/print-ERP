package com.bviit.analytics.surgery.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.surgery.dto.AccumulatedEyeRow;
import com.bviit.analytics.surgery.dto.ReoperationDecisionRow;
import com.bviit.analytics.surgery.dto.ReoperationDecisionSaveRequest;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.service.AccumulatedEyeReader;
import com.bviit.analytics.surgery.service.ReoperationCandidateReader;
import com.bviit.analytics.surgery.service.ReoperationDecisionService;
import com.bviit.analytics.surgery.service.SurgeryCompositionReader;
import com.bviit.analytics.surgery.service.SurgeryListReader;
import com.bviit.analytics.surgery.service.SurgeryStatsReader;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/*surgery*, /api/reoperation-decisions, /api/accumulated-eyes 12개 엔드포인트 문서화.
 *
 * 모두 MEDICAL/ALL 부서 (accumulated-eyes 만 MARKETING/ALL). 모두 마트 미연결 시 503.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-surgery-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:surgery-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class SurgeryDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean SurgeryListReader surgeryListReader;
    @MockitoBean SurgeryStatsReader surgeryStatsReader;
    @MockitoBean SurgeryCompositionReader surgeryCompositionReader;
    @MockitoBean ReoperationCandidateReader reoperationCandidateReader;
    @MockitoBean ReoperationDecisionService reoperationDecisionService;
    @MockitoBean AccumulatedEyeReader accumulatedEyeReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        Map<String, Object> listRow = new LinkedHashMap<>();
        listRow.put("reserveNum", "R202608140001");
        listRow.put("surgeryDate", "2026-08-14");
        listRow.put("examDate", "2026-08-01");
        listRow.put("chartNo", "C0000123");
        listRow.put("name", "홍길동");
        listRow.put("opRight", "SMILE PRO");
        listRow.put("opLeft", "SMILE PRO");
        listRow.put("doctor", "김의사");
        when(surgeryListReader.getSurgeryList(anyString(), anyString())).thenReturn(List.of(listRow));

        SurgeryMonthlyItem monthly = SurgeryMonthlyItem.builder()
                .year(2026).month(7)
                .lasek(20).lasik(15).smile(30).smilePro(45)
                .icl(12).tIcl(3).kpl(2).tKpl(1).viva(5).presbyond(4).piolPatients(20)
                .catMulti(40).catMono(50).catEdof(10)
                .xtra(5).waveVision(3).monoVision(2).contra(1).personal(1)
                .lasekEx(10).lasekRed(6)
                .reoperation(4).reopLaser(3).reopLens(1)
                .visionPatients(120).cataractPatients(95).total(215)
                .build();
        when(surgeryStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(monthly));

        SurgeryDailyItem daily = SurgeryDailyItem.builder()
                .date("2026-08-14")
                .lasek(2).lasik(1).smile(3).smilePro(4)
                .icl(1).tIcl(0).kpl(0).tKpl(0).viva(0).presbyond(0).piolPatients(1)
                .catMulti(1).catMono(1).catEdof(0)
                .xtra(0).waveVision(0).monoVision(0).contra(0).personal(0)
                .lasekEx(1).lasekRed(1)
                .reoperation(0).reopLaser(0).reopLens(0)
                .visionPatients(10).cataractPatients(2).total(12)
                .build();
        when(surgeryCompositionReader.getDaily(any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenReturn(new SurgeryCompositionReader.DailyResult(List.of(daily),
                        StatsResponseMeta.mart("2026-08", "surgery-composition-v1", 1)));

        Map<String, Object> candidate = new LinkedHashMap<>();
        candidate.put("chartNo", "C0000200");
        candidate.put("opDate", "2026-08-10");
        candidate.put("againR", "LASIK re");
        candidate.put("againL", "LASIK re");
        candidate.put("origOpDate", "2024-05-11");
        candidate.put("isAuto", true);
        candidate.put("excludeReason", null);
        when(reoperationCandidateReader.getCandidates(anyString(), anyString())).thenReturn(List.of(candidate));

        ReoperationDecisionRow decisionRow = ReoperationDecisionRow.builder()
                .id(501L).chartNo("C0000200").opDate(LocalDate.of(2026, 8, 10))
                .againR("LASIK re").againL("LASIK re").isReoperation(true)
                .memo("동일인·시술 확정")
                .updatedAt(LocalDateTime.of(2026, 9, 17, 9, 30))
                .updatedBy("docs-tester").build();
        when(reoperationDecisionService.findRows(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(decisionRow));
        when(reoperationDecisionService.saveBatch(any(ReoperationDecisionSaveRequest.class), anyString()))
                .thenReturn(List.of(decisionRow));

        AccumulatedEyeRow eyeRow = AccumulatedEyeRow.builder()
                .id("11111111-1111-1111-1111-111111111111")
                .custNum("2234076").customName("홍길동").customPhone("010-1234-5678")
                .operationCategory("시력교정").operationCode("SMILE_PRO")
                .operationDate("2026-08-14").accumulatedEyeCount(4200L)
                .eyePosition("R")
                .createDate("2026-08-14 10:30:00").lastModifiedDate("2026-08-14 10:30:00")
                .build();
        when(accumulatedEyeReader.getAccumulatedEyes(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(List.of(eyeRow));
        when(accumulatedEyeReader.getTotal()).thenReturn(4321567L);
    }

    // ─── /api/surgery-list ────────────────────────────────────────

    @Test
    void surgery_list_문서화() throws Exception {
        mockMvc.perform(get("/api/surgery-list")
                        .param("from", "2026-08-01").param("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("surgery-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("수술자 리스트")
                                .description("기준일=수술일, 보조일=검사일. postgres-mart 프로파일에서 마트 조회. 최대 366일. 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("수술일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("수술일 종료 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("수술자 행 배열 — camelCase 키. reserveNum, surgeryDate, examDate, chartNo, name, opRight, opLeft, doctor 등"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("SurgeryListResponse"))
                                .build())));
    }

    // ─── /api/stats/surgery/{kpi, panel/trend, panel/composition} ──

    @Test
    void surgery_panel_kpi_문서화() throws Exception {
        docSurgeryPanel("/kpi", "surgery-panel-kpi",
                "수술 패널 KPI",
                "홈 대시보드 수술 KPI 카드. 응답은 surgery/monthly 와 동일한 SurgeryMonthlyItem 배열. "
                        + "SecurityConfig 홈 예외 매처 — MEDICAL·MARKETING·OVERSEAS_MARKETING·ALL 부서 무관 열람. 미연결 시 503.");
    }

    @Test
    void surgery_panel_trend_문서화() throws Exception {
        docSurgeryPanel("/panel/trend", "surgery-panel-trend",
                "수술 패널 월별 추이",
                "SurgeryPage·SurgeryRatioPage·SurgeryCompositionPage 세 화면이 이 하나를 공유. "
                        + "SecurityConfig 홈 예외 매처 — MEDICAL·MARKETING·OVERSEAS_MARKETING·ALL 부서 무관 열람. 미연결 시 503.");
    }

    @Test
    void surgery_panel_composition_문서화() throws Exception {
        docSurgeryPanel("/panel/composition", "surgery-panel-composition",
                "수술 패널 구성",
                "동일한 SurgeryMonthlyItem 배열. 프론트에서 비중(%) 계산. MEDICAL/ALL. 미연결 시 503.");
    }

    // ─── /api/stats/surgery/{monthly, daily} · /api/stats/surgery-ratio ──

    @Test
    void surgery_monthly_문서화() throws Exception {
        docSurgeryYears("/api/stats/surgery/monthly", "surgery-monthly",
                "수술 통계 — 월별",
                "환자수(DISTINCT CUST_NUM) 기준. 그룹: refractive(lasek·lasik·smile·smilePro), "
                        + "lens(icl·tIcl·kpl·tKpl·viva), cataract(catMulti·catMono·catEdof). "
                        + "재수술은 레코드 단위. MEDICAL/ALL. 미연결 시 503.");
    }

    @Test
    void surgery_ratio_문서화() throws Exception {
        docSurgeryYears("/api/stats/surgery-ratio", "surgery-ratio",
                "수술별 비중 (월별)",
                "응답은 surgery/monthly 와 동일 — 프론트에서 비중(%) 계산. PIOL 합계는 반드시 piolPatients 를 쓴다"
                        + " (icl+tIcl+kpl+tKpl+viva 단순합과 다르다 — 양안 다른 렌즈 케이스 이중집계). MEDICAL/ALL.");
    }

    @Test
    void surgery_daily_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/surgery/daily")
                        .param("from", "2026-08-01").param("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("surgery-daily",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("일자별 수술 통계 (SurgeryCompositionPage 일별 모드)")
                                .description("postgres-mart 에서는 mart_surgery_daily 조회. 마트 미적재 구간은 소스 라이브 폴백. "
                                        + "월별 레거시 override(2024~2026 1~4월 시력교정) 는 일별에 적용 안 됨 → 월 합계 어긋날 수 있음. "
                                        + "최대 371일(ISO 53주). MEDICAL/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("수술일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("수술일 종료 (YYYY-MM-DD, 최대 371일)"))
                                .responseFields(surgeryDailyFields())
                                .responseSchema(Schema.schema("SurgeryDailyListResponse"))
                                .build())));
    }

    // ─── /api/stats/surgery/reoperation-candidates ────────────────

    @Test
    void surgery_reoperation_candidates_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/surgery/reoperation-candidates")
                        .param("from", "2026-01-01").param("to", "2026-12-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("surgery-reoperation-candidates",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("재수술 후보 리스트 (검토용, 읽기 전용)")
                                .description("RE_OPERATION 원본 행 + 자동판정·제외사유. 자동 집계(월간 레포트 재수술) 의 포함/제외를 행 단위로 확인. "
                                        + "postgres-mart 에서는 list_reoperation 마트 조회(MSSQL 왕복 없음). 최대 366일. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("수술일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("수술일 종료 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("후보 행 배열 — chartNo, opDate, againR/L, origOpDate, isAuto, excludeReason 등"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReoperationCandidateListResponse"))
                                .build())));
    }

    // ─── /api/reoperation-decisions ─────────────────────────────

    @Test
    void reoperation_decisions_list_문서화() throws Exception {
        mockMvc.perform(get("/api/reoperation-decisions")
                        .param("from", "2026-01-01").param("to", "2026-12-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reoperation-decisions-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("재수술 판정 조회 (담당자 확정값)")
                                .description("자동판정(RE_OPERATION 기반)과 별개로 담당자가 확정한 재수술 여부. "
                                        + "(chartNo, opDate) 유니크. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("수술일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("수술일 종료 (YYYY-MM-DD)"))
                                .responseFields(reoperationDecisionListFields())
                                .responseSchema(Schema.schema("ReoperationDecisionListResponse"))
                                .build())));
    }

    @Test
    void reoperation_decisions_save_문서화() throws Exception {
        ReoperationDecisionSaveRequest req = new ReoperationDecisionSaveRequest();
        ReoperationDecisionSaveRequest.Item item = new ReoperationDecisionSaveRequest.Item();
        item.setChartNo("C0000200");
        item.setOpDate(LocalDate.of(2026, 8, 10));
        item.setAgainR("LASIK re");
        item.setAgainL("LASIK re");
        item.setIsReoperation(true);
        item.setMemo("동일인·시술 확정");
        req.setDecisions(List.of(item));

        mockMvc.perform(put("/api/reoperation-decisions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reoperation-decisions-save",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("재수술 판정 배치 저장 (모달 상태 전체 upsert)")
                                .description("(chartNo, opDate) 유니크 기준 upsert. 저장 성공 시 영향 받은 opDate 범위에 대해 "
                                        + "surgery 마트를 즉시 재빌드 — /stats/surgery-composition 등 마트 조회 화면이 다음 배치를 기다리지 않고 반영. "
                                        + "마트 프로필 밖에서는 refresher 빈이 없어 자동 no-op. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .requestFields(
                                        fieldWithPath("decisions").description("판정 배열 (비어있으면 400)"),
                                        fieldWithPath("decisions[].chartNo").description("차트번호 (필수, ≤50)"),
                                        fieldWithPath("decisions[].opDate").description("수술일 (필수, YYYY-MM-DD)"),
                                        fieldWithPath("decisions[].againR").description("우안 시술명 (빈 문자열 허용, ≤200)"),
                                        fieldWithPath("decisions[].againL").description("좌안 시술명 (빈 문자열 허용, ≤200)"),
                                        fieldWithPath("decisions[].isReoperation").description("재수술 여부"),
                                        fieldWithPath("decisions[].memo").description("메모 (≤500)").optional().type(org.springframework.restdocs.payload.JsonFieldType.STRING))
                                .responseFields(reoperationDecisionListFields())
                                .requestSchema(Schema.schema("ReoperationDecisionSaveRequest"))
                                .responseSchema(Schema.schema("ReoperationDecisionListResponse"))
                                .build())));
    }

    // ─── /api/accumulated-eyes ─────────────────────────────────

    @Test
    void accumulated_eyes_list_문서화() throws Exception {
        mockMvc.perform(get("/api/accumulated-eyes")
                        .param("from", "2026-01-01").param("to", "2026-12-31")
                        .param("query", "홍길동").param("field", "name")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accumulated-eyes-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("누적 안수 리스트 (한 사람 양안은 R/L 각 1행)")
                                .description("기준일=operation_date. 무필터 조회는 366일 상한, 검색어(이름·차트·전화)가 있으면 3660일까지 허용 "
                                        + "(결과 폭이 자연히 좁혀지므로). field 는 all|name|chart|phone|eyes — 그 외 값은 all 로 클램프. "
                                        + "MARKETING/ALL 부서. 마트 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("수술일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("수술일 종료 (검색어 있으면 최대 3660일, 없으면 366일)"),
                                        parameterWithName("query").description("검색어 (이름·차트·전화, 옵션)").optional(),
                                        parameterWithName("field").description("검색 필드 — all|name|chart|phone|eyes (옵션, 기본 all)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].id").description("원천 UUID (화면 key)"),
                                        fieldWithPath("data[].custNum").description("차트번호 (BIGINT 원천, String 계약)"),
                                        fieldWithPath("data[].customName").description("이름"),
                                        fieldWithPath("data[].customPhone").description("연락처"),
                                        fieldWithPath("data[].operationCategory").description("수술 카테고리 (시력교정·백내장 등)"),
                                        fieldWithPath("data[].operationCode").description("수술 코드"),
                                        fieldWithPath("data[].operationDate").description("수술일 YYYY-MM-DD"),
                                        fieldWithPath("data[].accumulatedEyeCount").description("누적 안수 (long)"),
                                        fieldWithPath("data[].eyePosition").description("눈 위치 — R | L"),
                                        fieldWithPath("data[].createDate").description("원천 생성 시각"),
                                        fieldWithPath("data[].lastModifiedDate").description("원천 수정 시각"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("AccumulatedEyeListResponse"))
                                .build())));
    }

    @Test
    void accumulated_eyes_total_문서화() throws Exception {
        mockMvc.perform(get("/api/accumulated-eyes/total")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accumulated-eyes-total",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Surgery")
                                .summary("총 누적 안수 (홈 대시보드 KPI)")
                                .description("마트 max 값. MARKETING/ALL 부서. 마트 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING/ALL"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.total").description("총 누적 안수 (long)"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("AccumulatedEyeTotalResponse"))
                                .build())));
    }

    // ─── 공용 헬퍼 ────────────────────────────────────────────

    private void docSurgeryPanel(String pathSuffix, String docId, String summary, String description) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/stats/surgery" + pathSuffix)
                .param("years", "2025,2026")
                .header(HttpHeaders.AUTHORIZATION, bearer());
        mockMvc.perform(req).andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(surgeryMonthlySnippet(summary, description))));
    }

    private void docSurgeryYears(String path, String docId, String summary, String description) throws Exception {
        mockMvc.perform(get(path).param("years", "2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(surgeryMonthlySnippet(summary, description))));
    }

    private static ResourceSnippetParameters surgeryMonthlySnippet(String summary, String description) {
        return ResourceSnippetParameters.builder()
                .tag("Surgery")
                .summary(summary).description(description)
                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                .responseFields(surgeryMonthlyFields())
                .responseSchema(Schema.schema("SurgeryMonthlyListResponse"))
                .build();
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] surgeryMonthlyFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].year").description("연도"),
                fieldWithPath("data[].month").description("월 (1~12)"),
                fieldWithPath("data[].lasek").description("라섹 환자수 (DISTINCT)"),
                fieldWithPath("data[].lasik").description("라식"),
                fieldWithPath("data[].smile").description("스마일"),
                fieldWithPath("data[].smilePro").description("스마일 프로"),
                fieldWithPath("data[].icl").description("ICL"),
                fieldWithPath("data[].tIcl").description("T-ICL"),
                fieldWithPath("data[].kpl").description("KPL"),
                fieldWithPath("data[].tKpl").description("T-KPL"),
                fieldWithPath("data[].viva").description("VIVA"),
                fieldWithPath("data[].presbyond").description("노안 레이저 (PRESBYOND)"),
                fieldWithPath("data[].piolPatients").description("PIOL DISTINCT 환자수 (icl+tIcl+... 단순합과 다름)"),
                fieldWithPath("data[].catMulti").description("백내장 다초점"),
                fieldWithPath("data[].catMono").description("백내장 단초점"),
                fieldWithPath("data[].catEdof").description("백내장 EDOF"),
                fieldWithPath("data[].xtra").description("엑스트라 부가시술 (+X)"),
                fieldWithPath("data[].waveVision").description("웨이브비전 (W.V)"),
                fieldWithPath("data[].monoVision").description("모노비전 (MONO)"),
                fieldWithPath("data[].contra").description("콘트라 (CONT)"),
                fieldWithPath("data[].personal").description("퍼스널 (P.E)"),
                fieldWithPath("data[].lasekEx").description("라섹 EX (EX500)"),
                fieldWithPath("data[].lasekRed").description("라섹 Red"),
                fieldWithPath("data[].reoperation").description("재수술 합계 (레코드 단위)"),
                fieldWithPath("data[].reopLaser").description("재수술 — 레이저 (각막)"),
                fieldWithPath("data[].reopLens").description("재수술 — 렌즈 (remo/exch/IOL)"),
                fieldWithPath("data[].visionPatients").description("시력교정 환자수 (OPERATIONDATA · DISTINCT · 백내장 제외)"),
                fieldWithPath("data[].cataractPatients").description("백내장 환자수 (Cataract_Operationdata · DISTINCT)"),
                fieldWithPath("data[].total").description("총 환자수 = visionPatients + cataractPatients (비중 분모)"),
                subsectionWithPath("meta").description("응답 메타 (source=LIVE)")
        };
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] surgeryDailyFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].date").description("수술일 YYYY-MM-DD"),
                fieldWithPath("data[].lasek").description("라섹"),
                fieldWithPath("data[].lasik").description("라식"),
                fieldWithPath("data[].smile").description("스마일"),
                fieldWithPath("data[].smilePro").description("스마일 프로"),
                fieldWithPath("data[].icl").description("ICL"),
                fieldWithPath("data[].tIcl").description("T-ICL"),
                fieldWithPath("data[].kpl").description("KPL"),
                fieldWithPath("data[].tKpl").description("T-KPL"),
                fieldWithPath("data[].viva").description("VIVA"),
                fieldWithPath("data[].presbyond").description("PRESBYOND"),
                fieldWithPath("data[].piolPatients").description("PIOL DISTINCT 환자수"),
                fieldWithPath("data[].catMulti").description("백내장 다초점"),
                fieldWithPath("data[].catMono").description("백내장 단초점"),
                fieldWithPath("data[].catEdof").description("백내장 EDOF"),
                fieldWithPath("data[].xtra").description("엑스트라"),
                fieldWithPath("data[].waveVision").description("웨이브비전"),
                fieldWithPath("data[].monoVision").description("모노비전"),
                fieldWithPath("data[].contra").description("콘트라"),
                fieldWithPath("data[].personal").description("퍼스널"),
                fieldWithPath("data[].lasekEx").description("라섹 EX"),
                fieldWithPath("data[].lasekRed").description("라섹 Red"),
                fieldWithPath("data[].reoperation").description("재수술 합계 (건)"),
                fieldWithPath("data[].reopLaser").description("재수술 — 레이저"),
                fieldWithPath("data[].reopLens").description("재수술 — 렌즈"),
                fieldWithPath("data[].visionPatients").description("시력교정 환자수 DISTINCT"),
                fieldWithPath("data[].cataractPatients").description("백내장 환자수 DISTINCT"),
                fieldWithPath("data[].total").description("총 환자수"),
                subsectionWithPath("meta").description("응답 메타 (source=MART)")
        };
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] reoperationDecisionListFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].id").description("판정 PK"),
                fieldWithPath("data[].chartNo").description("차트번호"),
                fieldWithPath("data[].opDate").description("수술일 YYYY-MM-DD"),
                fieldWithPath("data[].againR").description("우안 시술명 (재수술 매칭 키)"),
                fieldWithPath("data[].againL").description("좌안 시술명"),
                fieldWithPath("data[].isReoperation").description("재수술 확정 여부 (isXxx 게터 이슈로 필드 직렬화 강제)"),
                fieldWithPath("data[].memo").description("메모").optional().type(org.springframework.restdocs.payload.JsonFieldType.STRING),
                fieldWithPath("data[].updatedAt").description("수정 시각"),
                fieldWithPath("data[].updatedBy").description("수정자 (JWT sub)")
        };
    }
}
