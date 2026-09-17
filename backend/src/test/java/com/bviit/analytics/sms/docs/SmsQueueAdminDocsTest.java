package com.bviit.analytics.sms.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.batch.job.SmsDispatchJob;
import com.bviit.analytics.sms.controller.SmsQueueAdminController;
import com.bviit.analytics.sms.dto.SmsQueueRow;
import com.bviit.analytics.sms.service.SmsDispatchQueueService;
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
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
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
 * /api/admin/batch/sms/queue/** 5개 엔드포인트 문서화 — 자동 발송 큐 관리.
 *
 * <p><b>롤 매트릭스</b> (SecurityConfig 매처):
 * <ul>
 *   <li>GET  /status · /rows · /statuses — MARKETING/ALL 부서 (STAFF ok · 조회는 항상 열려 있어야 함)</li>
 *   <li>POST /retry  — MARKETING/ALL + MANAGER 이상 (실패·취소 재실행은 실무 판단 필요)</li>
 *   <li>POST /run    — ADMIN 롤 (즉시 실행은 관리자 명시적 트리거)</li>
 * </ul>
 *
 * <p>컨트롤러와 SmsDispatchJob 모두 @Profile("postgres-mart") — @TestConfiguration 으로 mock 을 명시 등록.
 * SmsDispatchQueueService 는 @Service 라 @MockitoBean 로도 되지만 일관성을 위해 TestConfig 로 함께 등록.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-sms-queue-admin-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:sms-queue-admin-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
@Import(SmsQueueAdminDocsTest.TestConfig.class)
class SmsQueueAdminDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired SmsDispatchQueueService queueService;
    @Autowired SmsDispatchJob dispatchJob;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        Mockito.reset(queueService, dispatchJob);

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("PENDING", 12L);
        counts.put("PROCESSING", 0L);
        counts.put("RECEIVED", 8L);
        counts.put("DONE", 320L);
        counts.put("FAILED", 3L);
        counts.put("CANCELED", 5L);
        Mockito.when(queueService.statusCounts()).thenReturn(counts);
        Mockito.when(queueService.statusCounts(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(counts);
        Mockito.when(queueService.countDoneToday()).thenReturn(120L);
        Mockito.when(queueService.countDoneInRange(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(120L);

        SmsQueueRow row = SmsQueueRow.builder()
                .id(9101L).targetId(1L)
                .templateCode("T1")
                .scheduledAt(LocalDateTime.of(2026, 8, 15, 10, 30))
                .kind("NOTIFICATION").status("FAILED").attemptCount(2)
                .lastError("KakaoI: DFTL_TIMEOUT")
                .pickedAt(LocalDateTime.of(2026, 8, 15, 10, 30, 5))
                .processedAt(LocalDateTime.of(2026, 8, 15, 10, 30, 8))
                .chartNo("2234076").name("홍길동").phone("01012345678")
                .surgeryDate(LocalDate.of(2026, 8, 14))
                .build();
        Mockito.when(queueService.findByStatusEnriched(anyString(), anyInt(), any(), any()))
                .thenReturn(List.of(row));

        Mockito.when(queueService.retryRows(anyList())).thenReturn(3);

        Map<String, Integer> stats = new HashMap<>();
        stats.put("PICKED", 8);
        stats.put("SENT", 7);
        stats.put("FAILED", 1);
        Mockito.when(dispatchJob.run()).thenReturn(stats);
    }

    @Test
    void sms_queue_status_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/batch/sms/queue/status")
                        .param("from", "2026-08-01").param("to", "2026-08-15")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-queue-status",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsQueueAdmin")
                                .summary("큐 상태 요약 KPI (상단 카드)")
                                .description("from/to 없이 부르면 '최신 사이클' 기준(같은 대상+차수의 가장 최신 scheduled_at 한 행) 카운트. "
                                        + "from/to (to exclusive) 를 넘기면 그 범위의 큐를 상태별로 센다. "
                                        + "done_today 필드는 그 범위의 RECEIVED+DONE 합. MARKETING/ALL 부서 (STAFF ok).")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .queryParameters(
                                        parameterWithName("from").description("scheduled_at 시작 (YYYY-MM-DD, 옵션 · 자정)").optional(),
                                        parameterWithName("to").description("scheduled_at 종료 (YYYY-MM-DD, 옵션 · to exclusive)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data.counts").description("상태별 카운트 — PENDING·PROCESSING·RECEIVED·DONE·FAILED·CANCELED (Long)"),
                                        fieldWithPath("data.done_today").description("완료 건수 (오늘 또는 범위 지정 시 그 범위)"))
                                .responseSchema(Schema.schema("SmsQueueStatusResponse"))
                                .build())));
    }

    @Test
    void sms_queue_rows_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/batch/sms/queue/rows")
                        .param("status", "FAILED").param("limit", "100")
                        .param("from", "2026-08-01").param("to", "2026-08-15")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-queue-rows",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsQueueAdmin")
                                .summary("상태별 큐 행 조회 (재실행 모달)")
                                .description("target 조인해 차트번호·이름·연락처·수술일까지 함께 반환 (대상 삭제된 옛 큐면 null). "
                                        + "limit 은 1~500 clamp, 기본 100. from/to 는 scheduled_at 기준(to exclusive). "
                                        + "MARKETING/ALL 부서 (STAFF ok).")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .queryParameters(
                                        parameterWithName("status").description("큐 상태 — PENDING|PROCESSING|RECEIVED|DONE|FAILED|CANCELED (기본 FAILED)").optional(),
                                        parameterWithName("limit").description("최대 행 수 (1~500 clamp, 기본 100)").optional(),
                                        parameterWithName("from").description("scheduled_at 시작 (옵션)").optional(),
                                        parameterWithName("to").description("scheduled_at 종료 (옵션, exclusive)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].id").description("큐 PK"),
                                        fieldWithPath("data[].targetId").description("대상 PK"),
                                        fieldWithPath("data[].templateCode").description("차수 코드 T1|T2|T3"),
                                        fieldWithPath("data[].scheduledAt").description("예정 발송 시각 (LocalDateTime)"),
                                        fieldWithPath("data[].kind").description("메시지 종류 — NOTIFICATION|AD"),
                                        fieldWithPath("data[].status").description("큐 상태"),
                                        fieldWithPath("data[].attemptCount").description("시도 횟수"),
                                        fieldWithPath("data[].lastError").description("마지막 오류 사유").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].pickedAt").description("폴러가 집어간 시각").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].processedAt").description("처리 완료 시각").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].chartNo").description("대상 차트번호 (조인 · 대상 삭제 시 null)").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].name").description("대상 이름").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].phone").description("대상 연락처").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].surgeryDate").description("대상 수술일").optional().type(JsonFieldType.STRING))
                                .responseSchema(Schema.schema("SmsQueueRowListResponse"))
                                .build())));
    }

    @Test
    void sms_queue_retry_문서화() throws Exception {
        mockMvc.perform(post("/api/admin/batch/sms/queue/retry")
                        .queryParam("ids", "9101,9102,9103")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-queue-retry",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsQueueAdmin")
                                .summary("실패·취소 행 재실행 (MANAGER+)")
                                .description("attempt_count 를 0 으로 리셋하고 상태를 PENDING 으로 되돌린다. "
                                        + "실 발송 트리거는 아니며 다음 폴러 사이클(5분)에 잡힌다. "
                                        + "MARKETING/ALL 부서 + MANAGER 이상(STAFF 불가). MEDICAL MANAGER 는 부서 gate 로 차단.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MANAGER+"))
                                .queryParameters(parameterWithName("ids").description("큐 PK 목록 (쉼표 구분, 예: 1,2,3 · 비면 아무 것도 안 함)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("리셋된 행 수"))
                                .responseSchema(Schema.schema("SmsQueueRetryResponse"))
                                .build())));
    }

    @Test
    void sms_queue_run_문서화() throws Exception {
        mockMvc.perform(post("/api/admin/batch/sms/queue/run")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-queue-run",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsQueueAdmin")
                                .summary("5분 폴러 즉시 실행 (ADMIN)")
                                .description("개발·긴급용. enabled=false 여도 이 엔드포인트는 실행한다(관리자 명시적 트리거). "
                                        + "배치 이력에도 남는다. ADMIN 롤 필수.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data")
                                                .description("실행 통계 — 키 예시: PICKED (폴러가 집어간 수) / SENT (전송 성공) / FAILED (실패)"))
                                .responseSchema(Schema.schema("SmsQueueRunResponse"))
                                .build())));
    }

    @Test
    void sms_queue_statuses_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/batch/sms/queue/statuses")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-queue-statuses",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsQueueAdmin")
                                .summary("큐 상태 enum 목록 (프론트 helper)")
                                .description("프론트가 상태 목록을 하드코딩하지 않아도 되게 서버가 서빙. "
                                        + "순서 = PENDING → PROCESSING → RECEIVED → DONE → FAILED → CANCELED. MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("상태 문자열 배열"))
                                .responseSchema(Schema.schema("SmsQueueStatusesResponse"))
                                .build())));
    }

    /**
     * SmsQueueAdminController + SmsDispatchJob 모두 @Profile("postgres-mart") — 기본 프로파일에선
     * 안 만들어진다. mock 을 명시 등록해 컨트롤러를 뜨게 한다 (BatchAdminDocsTest 와 동일 패턴).
     */
    @TestConfiguration
    static class TestConfig {
        @Bean SmsDispatchQueueService smsDispatchQueueService() {
            return Mockito.mock(SmsDispatchQueueService.class);
        }
        @Bean SmsDispatchJob smsDispatchJob() {
            return Mockito.mock(SmsDispatchJob.class);
        }
        @Bean SmsQueueAdminController smsQueueAdminController(
                SmsDispatchQueueService queueService, SmsDispatchJob dispatchJob) {
            return new SmsQueueAdminController(queueService, dispatchJob);
        }
    }
}
