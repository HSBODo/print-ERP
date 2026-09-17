package com.bviit.analytics.sms.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsImportResult;
import com.bviit.analytics.sms.dto.SmsLookupRow;
import com.bviit.analytics.sms.dto.SmsOffsetRow;
import com.bviit.analytics.sms.dto.SmsOffsetUpdateRequest;
import com.bviit.analytics.sms.dto.SmsOptOutRow;
import com.bviit.analytics.sms.dto.SmsSendLogRow;
import com.bviit.analytics.sms.dto.SmsSendRequest;
import com.bviit.analytics.sms.dto.SmsSendResult;
import com.bviit.analytics.sms.dto.SmsSolapiBalanceInfo;
import com.bviit.analytics.sms.dto.SmsSolapiTemplateInfo;
import com.bviit.analytics.sms.dto.SmsStatusRequest;
import com.bviit.analytics.sms.dto.SmsTargetRequest;
import com.bviit.analytics.sms.dto.SmsTargetRow;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.bviit.analytics.sms.entity.SmsOffsetConfig;
import com.bviit.analytics.sms.service.SmsOffsetConfigService;
import com.bviit.analytics.sms.service.SmsOptOutService;
import com.bviit.analytics.sms.service.SmsSendService;
import com.bviit.analytics.sms.service.SmsTargetService;
import com.bviit.analytics.sms.service.SolapiBalanceService;
import com.bviit.analytics.sms.service.SolapiSyncService;
import com.bviit.analytics.sms.service.SolapiTemplateLookupService;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.subsectionWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/sms-management/** 18개 엔드포인트 문서화.
 *
 * <p><b>SMS 롤 매트릭스</b> (SecurityConfig 매처 기반):
 * <ul>
 *   <li>조회·홀딩·수신거부·연락처 수정·수동 대상 추가 — <b>MARKETING/ALL 부서 (STAFF ok)</b></li>
 *   <li>[실행] 계열 — 오프셋 편집(PUT /offsets)·발송(POST /send)·동기화(POST /sync)·수술자 불러오기(POST /targets/import) — <b>ADMIN 롤 필수</b></li>
 * </ul>
 * 응답 실림(연락처 등) 이 있어 백엔드에서도 롤을 강제한다(프론트 가드에만 의존하지 않는다).
 *
 * <p>총 8개 서비스(SmsTargetService · SmsOptOutService · SmsSendService · SolapiSyncService ·
 * SolapiProperties · SmsOffsetConfigService · SolapiTemplateLookupService · SolapiBalanceService)
 * 을 @MockitoBean 으로 치환한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-sms-management-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:sms-management-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class SmsManagementDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean SmsTargetService targetService;
    @MockitoBean SmsOptOutService optOutService;
    @MockitoBean SmsSendService sendService;
    @MockitoBean SolapiSyncService syncService;
    @MockitoBean SolapiProperties solapiProperties;
    @MockitoBean SmsOffsetConfigService offsetConfigService;
    @MockitoBean SolapiTemplateLookupService solapiTemplateLookupService;
    @MockitoBean SolapiBalanceService solapiBalanceService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        Mockito.reset(targetService, optOutService, sendService, syncService,
                solapiProperties, offsetConfigService, solapiTemplateLookupService, solapiBalanceService);

        when(targetService.lookup(anyString())).thenReturn(new SmsLookupRow(
                true, false,
                "2234076", "홍길동", "010-1234-5678",
                "2026-08-14", "라식", "lasik", "-8.00 D", "-7.50 D"));

        SmsSendLogRow sendLog = SmsSendLogRow.builder()
                .id(9001L).targetId(1L)
                .templateCode("T1").templateLabel("1차")
                .requestedChannel("ALIMTALK").messageType("ATA")
                .solapiGroupId("G20260814-0001").solapiMessageId("M20260814-0001")
                .statusCode("2000").status("DELIVERED").failReason("")
                .sentAt("2026-08-14 10:30").sentBy("docs-tester")
                .deliveredAt("2026-08-14 10:31").replacement(false)
                .build();

        SmsTargetRow targetRow = SmsTargetRow.builder()
                .id(1L).chartNo("2234076").name("홍길동").phone("01012345678").phoneValid(true)
                .surgeryDate("2026-08-14").scheduleBase("2026-08-14").rebased(false)
                .surgeryType("라식").opType("lasik").surgeryR("-8.00 D").surgeryL("-7.50 D")
                .status("SENDABLE").source("AUTO").optedOut(false)
                .logs(List.of(sendLog)).tierQueues(Map.of())
                .build();
        when(targetService.findRowsAutoImport(any(LocalDate.class), any(LocalDate.class), anyString(), any()))
                .thenReturn(List.of(targetRow));
        when(targetService.create(any(SmsTargetRequest.class))).thenReturn(targetRow);
        when(targetService.update(anyLong(), any(SmsTargetRequest.class))).thenReturn(targetRow);
        when(targetService.changeStatus(anyLong(), anyString())).thenReturn(targetRow);
        when(targetService.changeStatusBulk(anyList(), anyString())).thenReturn(3);
        when(targetService.importFromSurgeryList(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new SmsImportResult(12, 3, 5));

        when(optOutService.registerByTargets(anyList(), anyString())).thenReturn(3);
        when(optOutService.findAll()).thenReturn(List.of(new SmsOptOutRow(
                101L, "010-****-5678", "2234076", "홍길동", "MANUAL",
                "2026-08-14T10:20:00", "docs-tester")));
        when(optOutService.release(anyString())).thenReturn(true);
        when(optOutService.releaseById(anyLong())).thenReturn(true);

        when(sendService.send(any(SmsSendRequest.class), anyString())).thenReturn(SmsSendResult.builder()
                .requested(3).success(2).failed(0).skipped(1)
                .items(List.of(
                        SmsSendResult.Item.builder().targetId(1L).name("홍길동").result("SUCCESS").detail("").dryRun(false).build(),
                        SmsSendResult.Item.builder().targetId(2L).name("김민수").result("SUCCESS").detail("").dryRun(false).build(),
                        SmsSendResult.Item.builder().targetId(3L).name("이영희").result("SKIPPED").detail("발송 홀딩 상태입니다.").dryRun(false).build()))
                .build());

        when(syncService.sync(any(LocalDate.class), any(LocalDate.class))).thenReturn(24);

        SmsTemplateGroupInfo group = new SmsTemplateGroupInfo(
                "SMILE", "스마일",
                List.of("smilePro", "smile"),
                1,
                null, null,   // templateId·smsText — @JsonIgnore 로 응답 미포함
                "수술 후 정기 검사 안내입니다.",
                true, true, true);
        SmsTemplateInfo template = new SmsTemplateInfo("T1", "1차", 1, List.of(group));
        when(solapiProperties.templates()).thenReturn(List.of(template));

        when(solapiTemplateLookupService.listConfigured()).thenReturn(List.of(new SmsSolapiTemplateInfo(
                "SMILE", "스마일", 1, "1차",
                "TPL-KAKAO-0001", true, "APPROVED",
                "post-op-smile-tier1", "수술 후 정기 검사 안내입니다.",
                "AT", "005001",
                null)));

        when(solapiBalanceService.getBalance()).thenReturn(SmsSolapiBalanceInfo.of(
                new BigDecimal("120000.00"),
                new BigDecimal("5000.00"),
                new BigDecimal("132000.00"),
                new BigDecimal("120000.00")));

        // 4행 그리드 (SMILE·LASIK·LASEK·ICL) — REST Docs 로 SmsOffsetRow 필드를 강제 검증.
        // 순서 보존을 위해 LinkedHashMap 사용.
        Map<String, SmsOffsetConfig> grid = new LinkedHashMap<>();
        grid.put("SMILE", offsetConfig("SMILE", 1, 7, 30));
        grid.put("LASIK", offsetConfig("LASIK", 1, 7, 30));
        grid.put("LASEK", offsetConfig("LASEK", 5, 12, 30));
        grid.put("ICL",   offsetConfig("ICL",   3, 10, 30));
        when(offsetConfigService.getAll()).thenReturn(grid);
        when(offsetConfigService.updateAll(anyList(), any(SmsOffsetConfigService.TierUpdate.class), anyString()))
                .thenReturn(grid);
    }

    /** 4행 mock offset 빌더 — tier 시각·종류는 4행 동일값(그리드 UI 계약). */
    private static SmsOffsetConfig offsetConfig(String group, int t1, int t2, int t3) {
        return SmsOffsetConfig.builder()
                .groupCode(group)
                .tier1Offset(t1).tier2Offset(t2).tier3Offset(t3)
                .tier1Time(LocalTime.of(10, 30))
                .tier2Time(LocalTime.of(10, 30))
                .tier3Time(LocalTime.of(10, 30))
                .tier1Kind(SmsOffsetConfig.KIND_NOTIFICATION)
                .tier2Kind(SmsOffsetConfig.KIND_NOTIFICATION)
                .tier3Kind(SmsOffsetConfig.KIND_AD)
                .updatedBy("docs-tester")
                .updatedAt(LocalDateTime.of(2026, 9, 17, 10, 30, 0))
                .build();
    }

    // ─── /lookup ────────────────────────────────────────────────

    @Test
    void sms_lookup_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/lookup")
                        .param("chartNo", "2234076")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-lookup",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("차트번호 조회 (대상 추가 팝업)")
                                .description("마트에서 이름·수술일·연락처·수술구분을 채운다. found=false 면 마트에 수술 이력이 없다는 뜻(직접 입력으로 진행). "
                                        + "alreadyRegistered=true 면 같은 (chartNo, surgeryDate) 대상이 이미 있다. "
                                        + "MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .queryParameters(parameterWithName("chartNo").description("차트번호"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.found").description("마트에 수술 기록이 있는지"),
                                        fieldWithPath("data.alreadyRegistered").description("이미 대상에 등록됐는지"),
                                        fieldWithPath("data.chartNo").description("차트번호"),
                                        fieldWithPath("data.name").description("이름"),
                                        fieldWithPath("data.phone").description("연락처"),
                                        fieldWithPath("data.surgeryDate").description("수술일 YYYY-MM-DD"),
                                        fieldWithPath("data.surgeryType").description("수술 구분(원본 라벨)"),
                                        fieldWithPath("data.opType").description("마트 op_type 코드 — 필수 (누락되면 수동 등록 행이 ETC 로 떨어져 영영 발송 안 됨)"),
                                        fieldWithPath("data.surgeryR").description("우안 수술내용"),
                                        fieldWithPath("data.surgeryL").description("좌안 수술내용"))
                                .responseSchema(Schema.schema("SmsLookupResponse"))
                                .build())));
    }

    // ─── /targets ─────────────────────────────────────────────

    @Test
    void sms_targets_list_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/targets")
                        .param("from", "2026-08-01").param("to", "2026-08-31")
                        .param("basis", "SURGERY").param("templateCode", "T1")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-targets-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 대상 조회 (수술일 기준은 자동 적재 동반)")
                                .description("basis=SURGERY(기본)면 마트에서 그 기간 수술자를 먼저 적재한 뒤 돌려준다 — [수술자 불러오기] 별도 클릭 불필요. "
                                        + "적재는 (chartNo + surgeryDate) UNIQUE 라 여러 번 조회해도 늘지 않는다. "
                                        + "basis=SCHEDULED(발송예정일), SENT(실제발송일) 도 지원. "
                                        + "MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .queryParameters(
                                        parameterWithName("from").description("범위 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("범위 종료 (YYYY-MM-DD)"),
                                        parameterWithName("basis").description("조회 기준 — SURGERY(기본) / SCHEDULED / SENT").optional(),
                                        parameterWithName("templateCode").description("차수 지정 — T1|T2|T3, 비우면 전체").optional())
                                .responseFields(targetRowListFields())
                                .responseSchema(Schema.schema("SmsTargetListResponse"))
                                .build())));
    }

    @Test
    void sms_targets_create_문서화() throws Exception {
        SmsTargetRequest req = new SmsTargetRequest("2234076", "홍길동", "010-1234-5678",
                LocalDate.parse("2026-08-14"), "라식", "lasik", "-8.00 D", "-7.50 D");
        mockMvc.perform(post("/api/sms-management/targets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-targets-create",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 대상 수동 추가")
                                .description("차트번호와 연락처가 필수 — 이름은 동명이인 때문에 특정 못 하고 발송에 필요한 건 번호다. "
                                        + "수술일 미입력 시 등록일로 저장. opType 을 안 담으면 ETC 로 떨어져 발송 안 되니 조회로 받은 코드를 그대로 담을 것. "
                                        + "MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .requestFields(targetRequestFields())
                                .responseFields(targetRowFields())
                                .requestSchema(Schema.schema("SmsTargetRequest"))
                                .responseSchema(Schema.schema("SmsTargetRowResponse"))
                                .build())));
    }

    @Test
    void sms_targets_update_문서화() throws Exception {
        SmsTargetRequest req = new SmsTargetRequest("2234076", "홍길동", "010-9999-8888",
                LocalDate.parse("2026-08-14"), "라식", "lasik", "-8.00 D", "-7.50 D");
        mockMvc.perform(put("/api/sms-management/targets/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-targets-update",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 대상 수정 (연락처만 · MANUAL 승격)")
                                .description("연락처 수정 시 소스가 MANUAL 로 승격돼 자동 갱신에서 보호된다. "
                                        + "기준일이 오늘 이후로 밀리면 tierQueues 가 재계산돼 화면 예정 셀도 갱신된다. "
                                        + "MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .pathParameters(parameterWithName("id").description("대상 PK"))
                                .requestFields(targetRequestFields())
                                .responseFields(targetRowFields())
                                .requestSchema(Schema.schema("SmsTargetRequest"))
                                .responseSchema(Schema.schema("SmsTargetRowResponse"))
                                .build())));
    }

    @Test
    void sms_targets_change_status_문서화() throws Exception {
        mockMvc.perform(put("/api/sms-management/targets/{id}/status", 1L)
                        .queryParam("value", "HOLD")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-targets-change-status",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 대상 상태 토글 (단건 홀딩/해제)")
                                .description("HOLD 로 걸면 큐의 PENDING 이 취소되고, SENDABLE 로 풀면 재등록된다. "
                                        + "삭제 API 는 없다 — 보내면 안 되는 사람은 지우지 않고 홀딩(왜 안 보냈는지가 남아야 한다). "
                                        + "MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .pathParameters(parameterWithName("id").description("대상 PK"))
                                .queryParameters(parameterWithName("value").description("상태 — SENDABLE | HOLD"))
                                .responseFields(targetRowFields())
                                .responseSchema(Schema.schema("SmsTargetRowResponse"))
                                .build())));
    }

    @Test
    void sms_targets_status_bulk_문서화() throws Exception {
        SmsStatusRequest req = new SmsStatusRequest(List.of(1L, 2L, 3L), "HOLD");
        mockMvc.perform(put("/api/sms-management/targets/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-targets-status-bulk",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 대상 일괄 상태 변경 (툴바 [발송중지]/[홀딩 해제])")
                                .description("선택한 대상들에 대해 HOLD/SENDABLE 을 한꺼번에 적용한다. data 는 반영된 행 수. MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .requestFields(
                                        fieldWithPath("targetIds").description("대상 PK 배열 (비어있으면 400)"),
                                        fieldWithPath("value").description("상태 — SENDABLE | HOLD"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("반영된 행 수"))
                                .requestSchema(Schema.schema("SmsStatusRequest"))
                                .responseSchema(Schema.schema("SmsStatusBulkResponse"))
                                .build())));
    }

    // ─── /opt-outs ────────────────────────────────────────────

    @Test
    void sms_opt_outs_register_문서화() throws Exception {
        SmsStatusRequest req = new SmsStatusRequest(List.of(1L, 2L), "HOLD");
        mockMvc.perform(post("/api/sms-management/opt-outs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-opt-outs-register",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("수신거부 등록 (사람 단위 · 선택 대상 번호)")
                                .description("선택 대상의 <b>번호</b>를 목록에 올리고 같은 번호의 모든 대상을 홀딩한다. "
                                        + "홀딩과 달리 사람 단위라 다음 수술에도 계속 막힌다. data 는 새로 등록된 번호 수. "
                                        + "MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .requestFields(
                                        fieldWithPath("targetIds").description("대상 PK 배열"),
                                        fieldWithPath("value").description("호환용 필드 — 실제로는 사용되지 않음 (SENDABLE|HOLD)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("새로 등록된 번호 수"))
                                .requestSchema(Schema.schema("SmsStatusRequest"))
                                .responseSchema(Schema.schema("SmsOptOutRegisterResponse"))
                                .build())));
    }

    @Test
    void sms_opt_outs_list_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/opt-outs")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-opt-outs-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("수신거부 목록 (번호 마스킹)")
                                .description("phoneMasked 로 앞 3자리+뒷 4자리만 남기고 가려서 내린다 — "
                                        + "확인 용도로는 뒷자리만으로 충분하고, 전체를 화면까지 내리면 노출 경로가 된다. MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].id").description("수신거부 PK"),
                                        fieldWithPath("data[].phoneMasked").description("가려진 번호 (010-****-1234)"),
                                        fieldWithPath("data[].chartNo").description("차트번호"),
                                        fieldWithPath("data[].name").description("이름"),
                                        fieldWithPath("data[].source").description("등록 경로 — MANUAL|BLOCK 등"),
                                        fieldWithPath("data[].createdAt").description("등록 시각 ISO-8601"),
                                        fieldWithPath("data[].createdBy").description("등록자"))
                                .responseSchema(Schema.schema("SmsOptOutListResponse"))
                                .build())));
    }

    @Test
    void sms_opt_outs_release_by_phone_문서화() throws Exception {
        mockMvc.perform(delete("/api/sms-management/opt-outs")
                        .queryParam("phone", "01012345678")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-opt-outs-release-by-phone",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("수신거부 해제 (번호로)")
                                .description("<b>홀딩은 함께 풀지 않는다</b> — 목록에서 뺐다고 지난 차수가 한꺼번에 나가면 곤란해서, "
                                        + "홀딩 해제는 사람이 따로 누른다. MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .queryParameters(parameterWithName("phone").description("원본 번호 (하이픈 있어도 됨)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("삭제 성공 여부"))
                                .responseSchema(Schema.schema("SmsOptOutReleaseResponse"))
                                .build())));
    }

    @Test
    void sms_opt_outs_release_by_id_문서화() throws Exception {
        mockMvc.perform(delete("/api/sms-management/opt-outs/{id}", 101L)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-opt-outs-release-by-id",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("수신거부 해제 (PK 로)")
                                .description("관리 모달용 — 목록 응답의 phone 이 마스킹돼 있어 phone 파라미터 대신 id 로 지운다. MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .pathParameters(parameterWithName("id").description("수신거부 PK"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("삭제 성공 여부"))
                                .responseSchema(Schema.schema("SmsOptOutReleaseByIdResponse"))
                                .build())));
    }

    // ─── /sync · /targets/import · /send ─────────────────────

    @Test
    void sms_sync_문서화() throws Exception {
        mockMvc.perform(post("/api/sms-management/sync")
                        .queryParam("sentFrom", "2026-08-07")
                        .queryParam("sentTo", "2026-08-14")
                        .queryParam("days", "7")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-sync",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 결과 되가져오기 (솔라피 재조회) — ADMIN")
                                .description("솔라피에 다시 물어 도달시각·대체발송·최종 상태를 채운다. "
                                        + "⚠️ 기간은 <b>발송 시각(sentAt)</b> 기준 — 수술일 범위 그대로 넘기면 오늘 생긴 이력을 못 찾는다. "
                                        + "sentFrom/sentTo 를 비우면 최근 days(기본 7)일. ADMIN 롤 필수.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN"))
                                .queryParameters(
                                        parameterWithName("sentFrom").description("발송 시각 시작 (YYYY-MM-DD, 옵션)").optional(),
                                        parameterWithName("sentTo").description("발송 시각 종료 (YYYY-MM-DD, 옵션)").optional(),
                                        parameterWithName("days").description("sentFrom·sentTo 미입력 시 되돌아볼 일수 (기본 7)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").description("반영된 이력 수"))
                                .responseSchema(Schema.schema("SmsSyncResponse"))
                                .build())));
    }

    @Test
    void sms_targets_import_문서화() throws Exception {
        mockMvc.perform(post("/api/sms-management/targets/import")
                        .queryParam("from", "2026-08-01")
                        .queryParam("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-targets-import",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("수술자 불러오기 (마트 → 대상 자동 등록) — ADMIN")
                                .description("mart_surgery_daily 에서 그 기간 수술자를 자동 등록한다. "
                                        + "created=새 등록 · updated=CRM 최신값으로 갱신한 자동 등록 행 · skipped=수동 등록이라 안 건드리거나 값 동일. "
                                        + "targets GET(basis=SURGERY) 이 이미 이 로직을 부르므로 이 엔드포인트는 명시적 새로고침 용도. ADMIN 롤 필수.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN"))
                                .queryParameters(
                                        parameterWithName("from").description("수술일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("수술일 종료 (YYYY-MM-DD)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.created").description("새로 등록한 대상 수"),
                                        fieldWithPath("data.updated").description("자동 등록 행 갱신 수"),
                                        fieldWithPath("data.skipped").description("건너뛴 수 (수동 행 · 변화 없음)"))
                                .responseSchema(Schema.schema("SmsImportResponse"))
                                .build())));
    }

    @Test
    void sms_send_문서화() throws Exception {
        SmsSendRequest req = new SmsSendRequest(List.of(1L, 2L, 3L), "T1", "ALIMTALK");
        mockMvc.perform(post("/api/sms-management/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-send",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("발송 실행 (수동 전송) — ADMIN")
                                .description("선택 대상들에게 지정 채널로 템플릿 1종을 보낸다. "
                                        + "<b>전체 트랜잭션이 아니다</b> — 대상마다 (의도 저장 → 전송 → 결과 기록)이 독립 트랜잭션이라 부분 성공 허용. "
                                        + "홀딩·수신거부 대상은 SKIPPED. 채널: ALIMTALK|SMS. ADMIN 롤 필수.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN"))
                                .requestFields(
                                        fieldWithPath("targetIds").description("대상 PK 배열 (비어있으면 400)"),
                                        fieldWithPath("templateCode").description("템플릿 코드 — T1|T2|T3"),
                                        fieldWithPath("channel").description("발송 채널 — ALIMTALK|SMS"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.requested").description("요청 건수"),
                                        fieldWithPath("data.success").description("성공 건수"),
                                        fieldWithPath("data.failed").description("실패 건수"),
                                        fieldWithPath("data.skipped").description("건너뛴 건수 (홀딩·존재하지 않음 등)"),
                                        fieldWithPath("data.items[].targetId").description("대상 PK"),
                                        fieldWithPath("data.items[].name").description("이름"),
                                        fieldWithPath("data.items[].result").description("SUCCESS | FAILED | SKIPPED"),
                                        fieldWithPath("data.items[].detail").description("사유 (건너뛰기·실패 시)"),
                                        fieldWithPath("data.items[].dryRun").description("dry-run 처리 여부"))
                                .requestSchema(Schema.schema("SmsSendRequest"))
                                .responseSchema(Schema.schema("SmsSendResponse"))
                                .build())));
    }

    // ─── /templates 계열 · /solapi-balance ────────────────

    @Test
    void sms_templates_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/templates")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-templates",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("템플릿 3종 슬롯 정의 (환경 설정 기반)")
                                .description("차수는 3개(T1~T3), 같은 차수라도 수술 그룹마다 문구·시점이 다르므로 groups 로 분해한다. "
                                        + "templateId·smsText 는 @JsonIgnore 로 응답 미포함 (승인 전 문구 노출 방지). MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].code").description("차수 코드 — T1|T2|T3 (발송 이력의 template_code)"),
                                        fieldWithPath("data[].label").description("차수 표시명 — 1차·2차·3차"),
                                        fieldWithPath("data[].tier").description("차수 번호 (1|2|3)"),
                                        fieldWithPath("data[].groups[].groupCode").description("수술 그룹 — SMILE|LASIK|LASEK|ICL"),
                                        fieldWithPath("data[].groups[].groupLabel").description("그룹 표시명"),
                                        fieldWithPath("data[].groups[].opTypes").description("이 그룹에 해당하는 op_type 코드 배열"),
                                        fieldWithPath("data[].groups[].offsetDays").description("기준일(수술일) 로부터 며칠 뒤 발송"),
                                        fieldWithPath("data[].groups[].smsTextDelayed").description("지연 발송용 본문 (경과 문장 제외)"),
                                        fieldWithPath("data[].groups[].alimtalkReady").description("알림톡 발송 가능"),
                                        fieldWithPath("data[].groups[].smsReady").description("문자 발송 가능"),
                                        fieldWithPath("data[].groups[].delayedReady").description("지연 본문 준비 여부"))
                                .responseSchema(Schema.schema("SmsTemplateListResponse"))
                                .build())));
    }

    @Test
    void sms_solapi_templates_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/solapi-templates")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-solapi-templates",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("솔라피 알림톡 템플릿 검증 조회")
                                .description("우리 슬롯(15개=5그룹×3차수) 중 templateId 가 설정된 것만 솔라피 API 로 조회해 "
                                        + "검수 상태·본문·messageType 을 함께 반환. API 키 미설정 시 빈 목록. "
                                        + "개별 슬롯 조회 실패는 found=false + errorMessage 로 표기 (전체 조회는 계속). MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].groupCode").description("우리 슬롯 — 수술 그룹 코드"),
                                        fieldWithPath("data[].groupLabel").description("그룹 표시명"),
                                        fieldWithPath("data[].tier").description("차수 번호 (1|2|3)"),
                                        fieldWithPath("data[].templateLabel").description("차수 표시명"),
                                        fieldWithPath("data[].templateId").description("우리가 설정한 알림톡 ID"),
                                        fieldWithPath("data[].found").description("솔라피 계정에서 조회됐는지"),
                                        fieldWithPath("data[].status").description("솔라피 검수 상태 — APPROVED|REJECTED|PENDING 등").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].name").description("솔라피 등록 이름").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].content").description("승인된 본문").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].messageType").description("메시지 유형 — AT (알림톡) 등").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].categoryCode").description("카테고리 코드").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data[].errorMessage").description("조회 실패 사유 (성공 시 null)").optional().type(JsonFieldType.STRING))
                                .responseSchema(Schema.schema("SmsSolapiTemplateListResponse"))
                                .build())));
    }

    @Test
    void sms_solapi_balance_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/solapi-balance")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-solapi-balance",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("솔라피 계정 잔액 조회 (자동 발송 큐 카드)")
                                .description("configured=false 면 API 키 미설정 (다른 필드는 무의미). "
                                        + "조회 실패는 errorMessage 로 표기 (500 안 던짐). "
                                        + "deposit 이 솔라피 콘솔의 \"잔액\"과 일치. MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.balance").description("부가세 제외 실사용 가능액 (원)").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.point").description("포인트 잔액 (원) — 발송에 우선 소진").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.deposit").description("예치금 (원, 부가세 포함) — 콘솔 표시값").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.balanceOnly").description("순수 충전 잔고 (원, 예치금 반영 전)").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.configured").description("API 키 설정 여부"),
                                        fieldWithPath("data.errorMessage").description("조회 실패 사유 (성공 시 null)").optional().type(JsonFieldType.STRING))
                                .responseSchema(Schema.schema("SmsSolapiBalanceResponse"))
                                .build())));
    }

    // ─── /offsets ─────────────────────────────────────────────

    @Test
    void sms_offsets_get_문서화() throws Exception {
        mockMvc.perform(get("/api/sms-management/offsets")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-offsets-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("오프셋 그리드 조회 (4행: SMILE·LASIK·LASEK·ICL)")
                                .description("ETC 는 발송 대상이 아니라 응답에 포함되지 않는다. "
                                        + "시각·종류는 tier-level 이라 4행에 같은 값(프론트는 첫 행 값만 편집). MARKETING/ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING/ALL 부서"))
                                .responseFields(smsOffsetRowFields())
                                .responseSchema(Schema.schema("SmsOffsetListResponse"))
                                .build())));
    }

    @Test
    void sms_offsets_update_문서화() throws Exception {
        SmsOffsetUpdateRequest req = new SmsOffsetUpdateRequest(
                List.of(
                        new SmsOffsetUpdateRequest.Row("SMILE", 1, 7, 30),
                        new SmsOffsetUpdateRequest.Row("LASIK", 1, 7, 30),
                        new SmsOffsetUpdateRequest.Row("LASEK", 5, 12, 30),
                        new SmsOffsetUpdateRequest.Row("ICL",   3, 10, 30)),
                LocalTime.of(10, 30),
                LocalTime.of(10, 30),
                LocalTime.of(10, 30),
                "NOTIFICATION", "NOTIFICATION", "AD");
        mockMvc.perform(put("/api/sms-management/offsets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("sms-offsets-update",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsManagement")
                                .summary("오프셋 원자적 편집 — ADMIN")
                                .description("PUT 은 항상 4행 전부를 받는다(그리드 UI 계약). 시각·종류는 tier-level 이라 4행 모두 같은 값으로 갱신. "
                                        + "저장 즉시 캐시가 무효화되어 다음 조회부터 새 오프셋이 반영된다. "
                                        + "세부 유효성(그룹 화이트리스트·차수 순서·kind 별 시각 제한) 은 서비스가 검사. ADMIN 롤 필수.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN"))
                                .requestFields(
                                        fieldWithPath("rows").description("오프셋 4행 (SMILE·LASIK·LASEK·ICL 전체 · 순서 무관)"),
                                        fieldWithPath("rows[].groupCode").description("수술 그룹 코드"),
                                        fieldWithPath("rows[].tier1Offset").description("1차 오프셋 (0~30일)"),
                                        fieldWithPath("rows[].tier2Offset").description("2차 오프셋 (0~30일)"),
                                        fieldWithPath("rows[].tier3Offset").description("3차 오프셋 (0~30일)"),
                                        fieldWithPath("tier1Time").description("1차 발송 시각 HH:mm"),
                                        fieldWithPath("tier2Time").description("2차 발송 시각 HH:mm"),
                                        fieldWithPath("tier3Time").description("3차 발송 시각 HH:mm"),
                                        fieldWithPath("tier1Kind").description("1차 메시지 종류 — NOTIFICATION|AD"),
                                        fieldWithPath("tier2Kind").description("2차 메시지 종류 — NOTIFICATION|AD"),
                                        fieldWithPath("tier3Kind").description("3차 메시지 종류 — NOTIFICATION|AD"))
                                .responseFields(smsOffsetRowFields())
                                .requestSchema(Schema.schema("SmsOffsetUpdateRequest"))
                                .responseSchema(Schema.schema("SmsOffsetListResponse"))
                                .build())));
    }

    // ─── 공용 필드 스니펫 ──────────────────────────────────────

    /** SmsOffsetRow 배열 응답 field-by-field 강제 검증. */
    private static org.springframework.restdocs.payload.FieldDescriptor[] smsOffsetRowFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].groupCode").description("수술 그룹 코드 — SMILE|LASIK|LASEK|ICL"),
                fieldWithPath("data[].label").description("그룹 표시명 (SurgeryGroup.label)"),
                fieldWithPath("data[].tier1Offset").description("1차 오프셋 (수술일 D+n)"),
                fieldWithPath("data[].tier2Offset").description("2차 오프셋"),
                fieldWithPath("data[].tier3Offset").description("3차 오프셋"),
                fieldWithPath("data[].tier1Time").description("1차 발송 시각 (HH:mm) — 4행 동일"),
                fieldWithPath("data[].tier2Time").description("2차 발송 시각 — 4행 동일"),
                fieldWithPath("data[].tier3Time").description("3차 발송 시각 — 4행 동일"),
                fieldWithPath("data[].tier1Kind").description("1차 메시지 종류 — NOTIFICATION(알림톡) | AD(광고톡, 08~20시)"),
                fieldWithPath("data[].tier2Kind").description("2차 메시지 종류"),
                fieldWithPath("data[].tier3Kind").description("3차 메시지 종류"),
                fieldWithPath("data[].updatedBy").description("마지막 편집자 (JWT sub)").optional().type(JsonFieldType.STRING),
                fieldWithPath("data[].updatedAt").description("마지막 편집 시각").optional().type(JsonFieldType.STRING)
        };
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] targetRequestFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("chartNo").description("차트번호 (필수, 최대 50)"),
                fieldWithPath("name").description("이름 (동명이인 있어 특정 못 함 — 옵션, 최대 100)").optional().type(JsonFieldType.STRING),
                fieldWithPath("phone").description("연락처 (필수 — 숫자/하이픈/공백만, 저장 시 정규화, 최대 20)"),
                fieldWithPath("surgeryDate").description("수술일 YYYY-MM-DD (미입력 시 등록일로 저장 — 중복 판별 키)").optional().type(JsonFieldType.STRING),
                fieldWithPath("surgeryType").description("수술 구분 원본 라벨").optional().type(JsonFieldType.STRING),
                fieldWithPath("opType").description("op_type 코드 (누락 시 ETC 로 떨어져 영영 발송 안 됨)").optional().type(JsonFieldType.STRING),
                fieldWithPath("surgeryR").description("우안 수술내용").optional().type(JsonFieldType.STRING),
                fieldWithPath("surgeryL").description("좌안 수술내용").optional().type(JsonFieldType.STRING)
        };
    }

    /** ApiResponse&lt;SmsTargetRow&gt; — 단건. */
    private static org.springframework.restdocs.payload.FieldDescriptor[] targetRowFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data.id").description("대상 PK"),
                fieldWithPath("data.chartNo").description("차트번호"),
                fieldWithPath("data.name").description("이름"),
                fieldWithPath("data.phone").description("연락처 (정규화된 숫자)"),
                fieldWithPath("data.phoneValid").description("발송 가능 번호 여부 — false 면 화면에서 '발송 불가'"),
                fieldWithPath("data.surgeryDate").description("수술일 YYYY-MM-DD"),
                fieldWithPath("data.scheduleBase").description("예정일 계산 기준일 — 보통 수술일과 같음"),
                fieldWithPath("data.rebased").description("기준일이 수술일과 달라진 행 (연락처 수정/홀딩 해제로 되살아난 건)"),
                fieldWithPath("data.surgeryType").description("수술 구분 원본 라벨"),
                fieldWithPath("data.opType").description("op_type 코드"),
                fieldWithPath("data.surgeryR").description("우안 수술내용"),
                fieldWithPath("data.surgeryL").description("좌안 수술내용"),
                fieldWithPath("data.status").description("SENDABLE | HOLD"),
                fieldWithPath("data.source").description("AUTO (자동 등록) | MANUAL (수동)"),
                fieldWithPath("data.optedOut").description("이 번호가 수신거부 목록에 있는지 (사람 단위, 홀딩과 별개)"),
                subsectionWithPath("data.logs").description("발송 이력 배열 (최신순) — SmsSendLogRow 필드는 아래 List 응답과 동일"),
                subsectionWithPath("data.tierQueues").description("차수(T1|T2|T3) 별 최신 큐 상태 — 화면 '예정' 셀이 이 값을 우선 사용")
        };
    }

    /** ApiResponse&lt;List&lt;SmsTargetRow&gt;&gt;. */
    private static org.springframework.restdocs.payload.FieldDescriptor[] targetRowListFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].id").description("대상 PK"),
                fieldWithPath("data[].chartNo").description("차트번호"),
                fieldWithPath("data[].name").description("이름"),
                fieldWithPath("data[].phone").description("연락처"),
                fieldWithPath("data[].phoneValid").description("발송 가능 번호 여부"),
                fieldWithPath("data[].surgeryDate").description("수술일"),
                fieldWithPath("data[].scheduleBase").description("예정일 계산 기준일"),
                fieldWithPath("data[].rebased").description("기준일 재조정 여부"),
                fieldWithPath("data[].surgeryType").description("수술 구분"),
                fieldWithPath("data[].opType").description("op_type 코드"),
                fieldWithPath("data[].surgeryR").description("우안 수술내용"),
                fieldWithPath("data[].surgeryL").description("좌안 수술내용"),
                fieldWithPath("data[].status").description("SENDABLE | HOLD"),
                fieldWithPath("data[].source").description("AUTO | MANUAL"),
                fieldWithPath("data[].optedOut").description("수신거부 여부"),
                fieldWithPath("data[].logs[].id").description("발송 이력 PK"),
                fieldWithPath("data[].logs[].targetId").description("대상 PK"),
                fieldWithPath("data[].logs[].templateCode").description("차수 코드 T1|T2|T3"),
                fieldWithPath("data[].logs[].templateLabel").description("차수 표시명"),
                fieldWithPath("data[].logs[].requestedChannel").description("요청 채널 ALIMTALK|SMS"),
                fieldWithPath("data[].logs[].messageType").description("실제 발송 유형 (SMS·LMS·ATA·CTA 등)"),
                fieldWithPath("data[].logs[].solapiGroupId").description("솔라피 groupId"),
                fieldWithPath("data[].logs[].solapiMessageId").description("솔라피 messageId (조회 키)"),
                fieldWithPath("data[].logs[].statusCode").description("솔라피 상태 코드 (2000 성공 등)"),
                fieldWithPath("data[].logs[].status").description("우리 시맨틱 상태 (DELIVERED·FAILED·PENDING 등)"),
                fieldWithPath("data[].logs[].failReason").description("실패 사유"),
                fieldWithPath("data[].logs[].sentAt").description("발송 시각 (yyyy-MM-dd HH:mm)"),
                fieldWithPath("data[].logs[].sentBy").description("발송자 (JWT sub)"),
                fieldWithPath("data[].logs[].deliveredAt").description("단말 도달 시각 (미도달 시 빈 문자열)"),
                fieldWithPath("data[].logs[].replacement").description("알림톡→문자 대체발송 여부"),
                subsectionWithPath("data[].tierQueues").description("차수별 최신 큐 상태 — 키는 T1|T2|T3, 없으면 맵에서 생략")
        };
    }
}
