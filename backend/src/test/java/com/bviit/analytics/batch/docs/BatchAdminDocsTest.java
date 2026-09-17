package com.bviit.analytics.batch.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.batch.BatchOrchestrator;
import com.bviit.analytics.batch.admin.ConsultationReconcileService;
import com.bviit.analytics.batch.admin.EtcReconcileService;
import com.bviit.analytics.batch.admin.ExamReconcileService;
import com.bviit.analytics.batch.admin.OutpatientReconcileService;
import com.bviit.analytics.batch.admin.OverallReconcileService;
import com.bviit.analytics.batch.admin.ReservationReconcileService;
import com.bviit.analytics.batch.admin.SurgeryReconcileService;
import com.bviit.analytics.batch.admin.controller.BatchAdminController;
import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.SurgeryMartJob;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.subsectionWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/admin/batch/** 22개 엔드포인트 문서화.
 *
 * BatchAdminController 는 @Profile("postgres-mart") 라 H2 기본 프로파일에선 빈이 안 생긴다.
 * @TestConfiguration 으로 목킹된 7개 reconcile 서비스 + orchestrator + surgeryMartJob + 리포지토리를
 * 주입해 컨트롤러를 명시적으로 등록한다.
 *
 * reconcile 응답은 모두 Map<String, Object> 로 동적이라 subsectionWithPath 로 상위만 표기하고
 * 세부 키는 문서 설명에 남긴다. rerun/backfill/oneday-flag 는 고정 키가 있어 필드로 잡는다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-batch-admin-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:batch-admin-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
@Import(BatchAdminDocsTest.TestConfig.class)
class BatchAdminDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired BatchOrchestrator orchestrator;
    @Autowired SurgeryMartJob surgeryMartJob;
    @Autowired BatchRunLogRepository batchRunLogRepository;
    @Autowired SurgeryReconcileService surgeryReconcileService;
    @Autowired ReservationReconcileService reservationReconcileService;
    @Autowired ExamReconcileService examReconcileService;
    @Autowired ConsultationReconcileService consultationReconcileService;
    @Autowired OutpatientReconcileService outpatientReconcileService;
    @Autowired OverallReconcileService overallReconcileService;
    @Autowired EtcReconcileService etcReconcileService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        Mockito.reset(orchestrator, surgeryMartJob, batchRunLogRepository,
                surgeryReconcileService, reservationReconcileService, examReconcileService,
                consultationReconcileService, outpatientReconcileService,
                overallReconcileService, etcReconcileService);

        Map<String, Object> ok = Map.of(
                "ok", true,
                "note", "reconcile 상세 통계는 batch_run_log 및 서비스 로그 참조",
                "years", List.of(2025, 2026));

        Mockito.when(surgeryReconcileService.reconcileMonthly(anyList())).thenReturn(ok);
        Mockito.when(surgeryReconcileService.reconcileDaily(anyString(), anyString())).thenReturn(ok);
        Mockito.when(surgeryReconcileService.reconcileList(anyString(), anyString())).thenReturn(ok);
        Mockito.when(reservationReconcileService.reconcileMonthly(anyList())).thenReturn(ok);
        Mockito.when(reservationReconcileService.reconcileOverallMonthly(anyList())).thenReturn(ok);
        Mockito.when(reservationReconcileService.reconcileList(anyString(), anyString())).thenReturn(ok);
        Mockito.when(examReconcileService.reconcileExamination(anyList())).thenReturn(ok);
        Mockito.when(examReconcileService.reconcileProcedureExam(anyList())).thenReturn(ok);
        Mockito.when(examReconcileService.reconcileExamList(anyString(), anyString())).thenReturn(ok);
        Mockito.when(examReconcileService.reconcileCataractExamList(anyString(), anyString())).thenReturn(ok);
        Mockito.when(consultationReconcileService.reconcileConsultationRate(anyList())).thenReturn(ok);
        Mockito.when(consultationReconcileService.reconcileStopReason(anyList())).thenReturn(ok);
        Mockito.when(consultationReconcileService.reconcileReservationRate(anyList(), anyString())).thenReturn(ok);
        Mockito.when(outpatientReconcileService.reconcileMonthly(anyList())).thenReturn(ok);
        Mockito.when(overallReconcileService.reconcileWeekly(anyList())).thenReturn(ok);
        Mockito.when(overallReconcileService.reconcileMonthly(anyList())).thenReturn(ok);
        Mockito.when(etcReconcileService.reconcileB2bRevenue(anyList())).thenReturn(ok);

        Mockito.when(surgeryMartJob.backfillReoperation(any(LocalDate.class), any(LocalDate.class))).thenReturn(42);

        Mockito.when(batchRunLogRepository.findRecent(anyInt())).thenReturn(List.of(
                BatchRunLog.builder()
                        .id(101L).jobName("mart.surgery")
                        .runType(BatchRunLog.RunType.DAILY)
                        .targetFrom(LocalDate.of(2026, 9, 15)).targetTo(LocalDate.of(2026, 9, 15))
                        .status(BatchRunLog.Status.SUCCESS)
                        .rowsUpserted(1234)
                        .tableStats(Map.of("mart_surgery_daily", 620, "mart_surgery_monthly", 12))
                        .startedAt(LocalDateTime.of(2026, 9, 16, 3, 0, 5))
                        .finishedAt(LocalDateTime.of(2026, 9, 16, 3, 1, 42))
                        .durationMs(97321L)
                        .errorMessage(null)
                        .build()));
    }

    // ─── rerun ─────────────────────────────────────────────────

    @Test
    void rerun_문서화() throws Exception {
        mockMvc.perform(post("/api/admin/batch/rerun")
                        .queryParam("from", "2026-06-01").queryParam("to", "2026-06-30")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("batch-rerun",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary("배치 재실행 (전체 도메인 또는 지정 1개)")
                                .description("domain=ALL(기본)이면 전체 도메인 순차 실행. "
                                        + "SURGERY·RESERVATION·EXAM·CONSULTATION·OUTPATIENT·OVERALL·ETC·ACCOUNTING·"
                                        + "RESERVATION_CHANGE·ACCUMULATED_EYES·SMS 중 지정 시 해당 도메인만. "
                                        + "별칭 경로 /surgery/rerun 도 동일 동작. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(
                                        parameterWithName("from").description("배치 대상 시작일 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("배치 대상 종료일 (YYYY-MM-DD, 포함)"))
                                .responseFields(
                                        fieldWithPath("ok").description("호출 성공 (실제 배치 완료 여부는 batch_run_log 참조)"),
                                        fieldWithPath("from").description("요청 시작일"),
                                        fieldWithPath("to").description("요청 종료일"),
                                        fieldWithPath("domain").description("정규화된 도메인명 (대문자)"),
                                        fieldWithPath("note").description("힌트 문구"))
                                .responseSchema(Schema.schema("BatchRerunResponse"))
                                .build())));
    }

    // ─── run-logs ──────────────────────────────────────────────

    @Test
    void run_logs_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/batch/run-logs").param("limit", "50")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("batch-run-logs",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary("배치 실행 이력 (최근 N건)")
                                .description("batch_run_log 를 id DESC 로 조회. limit 은 1~200 사이로 clamp. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(parameterWithName("limit").description("최대 반환 행 수 (기본 50, clamp 1~200)"))
                                .responseFields(
                                        fieldWithPath("[].id").description("이력 PK"),
                                        fieldWithPath("[].jobName").description("잡 이름 (mart.surgery 등)"),
                                        fieldWithPath("[].runType").description("실행 유형 — DAILY · MONTHLY_RECONCILE · MANUAL · POLLER"),
                                        fieldWithPath("[].targetFrom").description("대상 시작일"),
                                        fieldWithPath("[].targetTo").description("대상 종료일"),
                                        fieldWithPath("[].status").description("상태 — RUNNING · SUCCESS · FAILED"),
                                        fieldWithPath("[].rowsUpserted").description("총 upsert 행 수"),
                                        subsectionWithPath("[].tableStats").description("테이블별 적재 건수 (부분 실패 정보 포함, V17 이전은 null)"),
                                        fieldWithPath("[].startedAt").description("시작 시각"),
                                        fieldWithPath("[].finishedAt").description("완료 시각 (진행중이면 null)"),
                                        fieldWithPath("[].durationMs").description("소요시간 (ms, 진행중이면 null)"),
                                        fieldWithPath("[].errorMessage").description("실패 사유 (성공이면 null)").optional()
                                                .type(org.springframework.restdocs.payload.JsonFieldType.STRING))
                                .responseSchema(Schema.schema("BatchRunLogListResponse"))
                                .build())));
    }

    // ─── surgery ────────────────────────────────────────────────

    @Test
    void surgery_reconcile_monthly_문서화() throws Exception {
        docReconcileYears("surgery/reconcile-monthly", "batch-surgery-reconcile-monthly",
                "수술 마트 월별 재집계",
                "mart_surgery_monthly 를 원본에서 다시 계산해 덮어쓴다(min-year 가드 우회). ADMIN 전용.");
    }

    @Test
    void surgery_reconcile_daily_문서화() throws Exception {
        docReconcileRange("surgery/reconcile-daily", "batch-surgery-reconcile-daily",
                "수술 마트 일별 재집계",
                "mart_surgery_daily 를 원본에서 다시 계산해 덮어쓴다. ADMIN 전용.");
    }

    @Test
    void surgery_reconcile_list_문서화() throws Exception {
        docReconcileRange("surgery/reconcile-list", "batch-surgery-reconcile-list",
                "수술 리스트 재적재",
                "list_surgery 를 지정 기간의 원본으로 delete+insert 한다. ADMIN 전용.");
    }

    @Test
    void surgery_backfill_reoperation_문서화() throws Exception {
        mockMvc.perform(post("/api/admin/batch/surgery/backfill-reoperation")
                        .queryParam("from", "2026-01-01").queryParam("to", "2026-05-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("batch-surgery-backfill-reoperation",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary("재수술 리스트 백필 (확정 구간용)")
                                .description("MART_LIVE_FROM(2026-06-01) 이전 구간의 list_reoperation 만 다시 쓴다. "
                                        + "집계(mart_surgery_daily·monthly)와 list_surgery 는 건드리지 않아 골든값을 보존한다. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(
                                        parameterWithName("from").description("백필 시작일"),
                                        parameterWithName("to").description("백필 종료일"))
                                .responseFields(
                                        fieldWithPath("ok").description("호출 성공"),
                                        fieldWithPath("from").description("요청 시작일"),
                                        fieldWithPath("to").description("요청 종료일"),
                                        fieldWithPath("list_reoperation").description("삽입된 list_reoperation 행 수"),
                                        fieldWithPath("note").description("힌트 문구"))
                                .responseSchema(Schema.schema("BatchBackfillReoperationResponse"))
                                .build())));
    }

    // ─── exam ────────────────────────────────────────────────────

    @Test
    void exam_reconcile_oneday_flag_문서화() throws Exception {
        mockMvc.perform(post("/api/admin/batch/exam/reconcile-oneday-flag")
                        .queryParam("from", "2026-07-01").queryParam("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("batch-exam-reconcile-oneday-flag",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary("원데이 검사 소급 보정 수동 실행")
                                .description("정기: 매월 1일 03:30 KST 자동. 이 엔드포인트는 실패·backfill·개발 검증용. "
                                        + "list_exam UPDATE + mart_procedure_exam_monthly 재집계를 한 트랜잭션 내 원자적으로 실행. "
                                        + "min-year 가드 없음. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(
                                        parameterWithName("from").description("보정 시작일"),
                                        parameterWithName("to").description("보정 종료일"))
                                .responseFields(
                                        fieldWithPath("ok").description("호출 성공"),
                                        fieldWithPath("from").description("요청 시작일"),
                                        fieldWithPath("to").description("요청 종료일"),
                                        fieldWithPath("note").description("힌트 문구 (상세는 batch_run_log)"))
                                .responseSchema(Schema.schema("BatchOnedayReconcileResponse"))
                                .build())));
    }

    @Test
    void exam_reconcile_examination_문서화() throws Exception {
        docReconcileYears("exam/reconcile-examination", "batch-exam-reconcile-examination",
                "시술별 검사 마트 재집계",
                "mart_examination_monthly 재집계. ADMIN 전용.");
    }

    @Test
    void exam_reconcile_procedure_exam_문서화() throws Exception {
        docReconcileYears("exam/reconcile-procedure-exam", "batch-exam-reconcile-procedure-exam",
                "검사건수 마트 재집계",
                "mart_procedure_exam_monthly 재집계 (EXAM 행 + Cataract_Exam 세션). ADMIN 전용.");
    }

    @Test
    void exam_reconcile_exam_list_문서화() throws Exception {
        docReconcileRange("exam/reconcile-exam-list", "batch-exam-reconcile-exam-list",
                "검사자 리스트 재적재",
                "list_exam 을 지정 기간의 원본으로 delete+insert. ADMIN 전용.");
    }

    @Test
    void exam_reconcile_cataract_exam_list_문서화() throws Exception {
        docReconcileRange("exam/reconcile-cataract-exam-list", "batch-exam-reconcile-cataract-exam-list",
                "백내장 검사자 리스트 재적재",
                "list_cataract_exam 을 지정 기간의 원본으로 delete+insert. ADMIN 전용.");
    }

    // ─── reservation ────────────────────────────────────────────

    @Test
    void reservation_reconcile_monthly_문서화() throws Exception {
        docReconcileYears("reservation/reconcile-monthly", "batch-reservation-reconcile-monthly",
                "예약 마트 월별 재집계",
                "mart_reservation_monthly 재집계 (min-year 가드 우회). ADMIN 전용.");
    }

    @Test
    void reservation_reconcile_overall_monthly_문서화() throws Exception {
        docReconcileYears("reservation/reconcile-overall-monthly", "batch-reservation-reconcile-overall-monthly",
                "예약 종합 마트 월별 재집계",
                "mart_reservation_overall_monthly 재집계 (콜·온라인 분해). ADMIN 전용.");
    }

    @Test
    void reservation_reconcile_list_문서화() throws Exception {
        docReconcileRange("reservation/reconcile-list", "batch-reservation-reconcile-list",
                "예약자 리스트 재적재",
                "list_reservation · list_reservation_all · mart_list_reservation_homepage 를 지정 기간으로 delete+insert. ADMIN 전용.");
    }

    // ─── consultation ───────────────────────────────────────────

    @Test
    void consultation_reconcile_consultation_rate_문서화() throws Exception {
        docReconcileYears("consultation/reconcile-consultation-rate", "batch-consultation-reconcile-consultation-rate",
                "전환율 마트 재집계",
                "mart_consultation_rate_monthly 재집계 (원데이 · 일반 · 백내장 3계열). ADMIN 전용.");
    }

    @Test
    void consultation_reconcile_stop_reason_문서화() throws Exception {
        docReconcileYears("consultation/reconcile-stop-reason", "batch-consultation-reconcile-stop-reason",
                "중단 사유 마트 재집계",
                "mart_stop_reason_monthly 재집계 (7개 버킷). ADMIN 전용.");
    }

    @Test
    void consultation_reconcile_reservation_rate_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/batch/consultation/reconcile-reservation-rate")
                        .param("years", "2025,2026").param("category", "cataract")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("batch-consultation-reconcile-reservation-rate",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary("예약률 마트 재집계")
                                .description("mart_reservation_rate_monthly 재집계. category 로 시력교정/백내장 계열 선택. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(
                                        parameterWithName("years").description("재집계 연도 목록 (콤마 구분)"),
                                        parameterWithName("category").description("계열 — cataract(기본) · vision"))
                                .responseFields(
                                        fieldWithPath("ok").description("호출 성공"),
                                        subsectionWithPath("note").description("힌트 문구").optional(),
                                        subsectionWithPath("years").description("재집계된 연도 목록").optional())
                                .responseSchema(Schema.schema("BatchReconcileResponse"))
                                .build())));
    }

    // ─── outpatient / overall / etc ─────────────────────────────

    @Test
    void outpatient_reconcile_monthly_문서화() throws Exception {
        docReconcileYears("outpatient/reconcile-monthly", "batch-outpatient-reconcile-monthly",
                "외래수 마트 재집계",
                "mart_outpatient_count_monthly 재집계 (RESERVATION F). ADMIN 전용.");
    }

    @Test
    void overall_reconcile_weekly_문서화() throws Exception {
        docReconcileYears("overall/reconcile-weekly", "batch-overall-reconcile-weekly",
                "주간 검사자 종합지표 재집계",
                "mart_overall_exam_weekly 재집계. ADMIN 전용.");
    }

    @Test
    void overall_reconcile_monthly_문서화() throws Exception {
        docReconcileYears("overall/reconcile-monthly", "batch-overall-reconcile-monthly",
                "월별 검사자 종합지표 재집계",
                "mart_overall_exam_monthly 재집계. ADMIN 전용.");
    }

    @Test
    void etc_reconcile_b2b_revenue_문서화() throws Exception {
        docReconcileYears("etc/reconcile-b2b-revenue", "batch-etc-reconcile-b2b-revenue",
                "B2B 매출 마트 재집계",
                "mart_b2b_revenue_monthly 재집계 (min-year 가드 없음, 24·25 도 덮어씀). ADMIN 전용.");
    }

    // ─── 공용 헬퍼 ───────────────────────────────────────────────

    /** years 파라미터만 받는 reconcile GET 공통 문서화 (예: monthly/weekly). */
    private void docReconcileYears(String pathSuffix, String docId, String summary, String description) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/admin/batch/" + pathSuffix)
                .param("years", "2025,2026")
                .header(HttpHeaders.AUTHORIZATION, bearer());
        mockMvc.perform(req).andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary(summary).description(description)
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(parameterWithName("years").description("재집계 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("ok").description("호출 성공"),
                                        subsectionWithPath("note").description("힌트 문구").optional(),
                                        subsectionWithPath("years").description("재집계된 연도 목록").optional())
                                .responseSchema(Schema.schema("BatchReconcileResponse"))
                                .build())));
    }

    /** from·to 파라미터만 받는 reconcile GET 공통 문서화 (예: daily/list). */
    private void docReconcileRange(String pathSuffix, String docId, String summary, String description) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/admin/batch/" + pathSuffix)
                .param("from", "2026-06-01").param("to", "2026-06-30")
                .header(HttpHeaders.AUTHORIZATION, bearer());
        mockMvc.perform(req).andExpect(status().isOk())
                .andDo(document(docId,
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("BatchAdmin")
                                .summary(summary).description(description)
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .queryParameters(
                                        parameterWithName("from").description("재적재 시작일"),
                                        parameterWithName("to").description("재적재 종료일"))
                                .responseFields(
                                        fieldWithPath("ok").description("호출 성공"),
                                        subsectionWithPath("note").description("힌트 문구").optional(),
                                        subsectionWithPath("years").description("재집계 대상 연도(사용 시)").optional())
                                .responseSchema(Schema.schema("BatchReconcileResponse"))
                                .build())));
    }

    /**
     * BatchAdminController + 7개 reconcile 서비스는 @Profile("postgres-mart") 라 기본 프로파일에선
     * 안 만들어진다. @Bean 등록 시 클래스 @Profile 은 무시되므로 여기서 mock 을 주입해 만든다.
     */
    @TestConfiguration
    static class TestConfig {
        @Bean BatchOrchestrator batchOrchestrator() { return Mockito.mock(BatchOrchestrator.class); }
        @Bean SurgeryMartJob surgeryMartJob() { return Mockito.mock(SurgeryMartJob.class); }
        @Bean BatchRunLogRepository batchRunLogRepository() { return Mockito.mock(BatchRunLogRepository.class); }
        @Bean SurgeryReconcileService surgeryReconcileService() { return Mockito.mock(SurgeryReconcileService.class); }
        @Bean ReservationReconcileService reservationReconcileService() { return Mockito.mock(ReservationReconcileService.class); }
        @Bean ExamReconcileService examReconcileService() { return Mockito.mock(ExamReconcileService.class); }
        @Bean ConsultationReconcileService consultationReconcileService() { return Mockito.mock(ConsultationReconcileService.class); }
        @Bean OutpatientReconcileService outpatientReconcileService() { return Mockito.mock(OutpatientReconcileService.class); }
        @Bean OverallReconcileService overallReconcileService() { return Mockito.mock(OverallReconcileService.class); }
        @Bean EtcReconcileService etcReconcileService() { return Mockito.mock(EtcReconcileService.class); }

        @Bean
        BatchAdminController batchAdminController(
                BatchOrchestrator orchestrator, SurgeryMartJob surgeryMartJob,
                BatchRunLogRepository batchRunLogRepository, SurgeryReconcileService surgery,
                ReservationReconcileService reservation, ExamReconcileService exam,
                ConsultationReconcileService consultation, OutpatientReconcileService outpatient,
                OverallReconcileService overall, EtcReconcileService etc) {
            return new BatchAdminController(orchestrator, surgeryMartJob, batchRunLogRepository,
                    surgery, reservation, exam, consultation, outpatient, overall, etc);
        }
    }
}
