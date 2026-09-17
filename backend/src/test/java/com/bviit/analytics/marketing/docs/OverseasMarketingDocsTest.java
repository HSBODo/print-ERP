package com.bviit.analytics.marketing.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.marketing.dto.OverseasMarketingBucketItem;
import com.bviit.analytics.marketing.dto.OverseasMarketingCountryItem;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionQuery;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionUpsertRequest;
import com.bviit.analytics.marketing.dto.OverseasMarketingStatisticsResult;
import com.bviit.analytics.marketing.dto.OverseasMarketingSyncResult;
import com.bviit.analytics.marketing.service.OverseasMarketingEditor;
import com.bviit.analytics.marketing.service.OverseasMarketingReader;
import com.bviit.analytics.marketing.service.OverseasMarketingSyncer;
import com.bviit.analytics.marketing.service.OverseasReservationStatsService;
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

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.subsectionWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/overseas-marketing/** 13개 엔드포인트 문서화.
 *
 * 4개 서비스(Reader/Syncer/Editor/ReservationStatsService) 를 목킹. MARKETING·OVERSEAS_MARKETING 부서 전용.
 *
 * 접수 행(getReceptions)·CRM 고객·매칭 결과·통계 buckets 등 응답이 대부분 동적 Map 이라
 * subsectionWithPath 로 상위만 표기하고 세부 키는 description·다른 API 문서·소스 코드 주석에 남긴다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-overseas-marketing-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:overseas-marketing-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class OverseasMarketingDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean OverseasMarketingReader overseasMarketingReader;
    @MockitoBean OverseasMarketingSyncer overseasMarketingSyncer;
    @MockitoBean OverseasMarketingEditor overseasMarketingEditor;
    @MockitoBean OverseasReservationStatsService reservationStatsService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        Map<String, Object> receptionRow = new LinkedHashMap<>();
        receptionRow.put("sheetRowNumber", 42L);
        receptionRow.put("regDate", "2026-08-15");
        receptionRow.put("matchedDate", "2026-08-16");
        receptionRow.put("inquiryDate", "2026-08-14");
        receptionRow.put("customerNo", "1234567890123");
        receptionRow.put("name", "Anujin Tsendsuren");
        receptionRow.put("nationality", "몽골");
        receptionRow.put("gender", "F");
        receptionRow.put("birthDate", "1990-08-15");
        receptionRow.put("contact", "+976 8888-8888");
        receptionRow.put("email", "sample@example.com");
        receptionRow.put("channel", "Meta");
        receptionRow.put("matchStatus", "matched");
        when(overseasMarketingReader.getReceptions(any(OverseasMarketingReceptionQuery.class))).thenReturn(List.of(receptionRow));

        when(overseasMarketingReader.getStatistics(anyInt(), anyString())).thenReturn(new OverseasMarketingStatisticsResult(
                2026, "month",
                List.of(new OverseasMarketingBucketItem("2026-07", 120, 80, 30,
                        50_000_000L, 200_000_000L, 30_000_000L, 15_000_000L)),
                List.of(new OverseasMarketingCountryItem("몽골", 12),
                        new OverseasMarketingCountryItem("중국", 8))));

        when(overseasMarketingReader.syncCrm()).thenReturn(Map.of(
                "state", "running", "phase", "CRM 매칭", "startedAt", "2026-09-16T10:00:00"));
        when(overseasMarketingReader.syncCrmStatus()).thenReturn(Map.of(
                "state", "done", "matched", 120, "review", 8, "elapsedMs", 45_231));
        when(overseasMarketingReader.findCrmCustomer(anyString())).thenReturn(Map.of(
                "customerNo", "1234567890123", "name", "홍길동", "birthDate", "1990-08-15", "contact", "010-1111-2222"));
        when(overseasMarketingReader.confirmMatch(anyLong(), anyString(), anyString())).thenReturn(Map.of(
                "rowNumber", 42L, "customerNo", "1234567890123", "matchedBy", "docs-tester"));

        when(overseasMarketingSyncer.syncSheet()).thenReturn(new OverseasMarketingSyncResult(
                12, 3, 0, 0, 3_412L, "12건 삽입 · 3건 스킵"));

        when(overseasMarketingEditor.createRow(any(OverseasMarketingReceptionUpsertRequest.class), anyString())).thenReturn(200L);
        doNothing().when(overseasMarketingEditor).updateRow(anyLong(), any(OverseasMarketingReceptionUpsertRequest.class), anyString());
        doNothing().when(overseasMarketingEditor).deleteRow(anyLong());

        when(reservationStatsService.getStats(anyInt(), anyString())).thenReturn(Map.of(
                "year", 2026,
                "granularity", "month",
                "cutover", "2026-08-23",
                "buckets", List.of(
                        Map.of("bucket", "2026-07", "values", Map.of("total.inq", 120, "total.rsv", 80,
                                "anglo.inq", 45, "china.inq", 35, "mongolia.inq", 40)))));
        when(reservationStatsService.updateCell(any(LocalDate.class), anyString(), anyString(), anyInt(), anyString())).thenReturn(Map.of(
                "date", "2026-08-15", "groupKey", "mongolia", "metricKey", "inq", "value", 5));
    }

    // ── 예약통계 ───────────────────────────────────────────────

    @Test
    void reservation_stats_get_문서화() throws Exception {
        mockMvc.perform(get("/api/overseas-marketing/reservation-stats")
                        .param("year", "2026").param("granularity", "month")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-reservation-stats-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("예약통계 조회 (레거시 시드 + 자동 집계 병합)")
                                .description("~2026-08-23 은 레거시 구글시트 시드, 이후는 접수리스트 자동 집계. "
                                        + "buckets[].values 는 동적 키(그룹.지표): total/anglo/china/vietnam/mongolia/agency × inq/rsv/exam/surgery/outpatient + 채널별 세부. "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .queryParameters(
                                        parameterWithName("year").description("연도 (2020~2100)"),
                                        parameterWithName("granularity").description("집계 단위 — month(기본) · week · day"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.year").description("조회 연도"),
                                        fieldWithPath("data.granularity").description("집계 단위"),
                                        fieldWithPath("data.cutover").description("시드→자동 집계 컷오버 날짜 (YYYY-MM-DD)"),
                                        fieldWithPath("data.buckets[].bucket").description("버킷 라벨 (2026-07 / 2026-W30 / 2026-08-15)"),
                                        subsectionWithPath("data.buckets[].values").description("셀 값 맵 (0 은 생략, 키: 그룹.지표)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasReservationStatsResponse"))
                                .build())));
    }

    @Test
    void reservation_stats_put_문서화() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "groupKey", "mongolia", "metricKey", "inq", "value", 5));
        mockMvc.perform(put("/api/overseas-marketing/reservation-stats/{date}", "2026-08-15")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andDo(document("overseas-reservation-stats-put",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("예약통계 일별 셀 수동 수정")
                                .description("저장 즉시 자동 집계·시드보다 우선한다. groupKey 는 total/anglo/china/vietnam/mongolia/agency, "
                                        + "metricKey 는 inq/rsv/exam/surgery/outpatient 또는 그룹별 채널_inq/채널_rsv. value 는 0~99999. "
                                        + "MARKETING·OVERSEAS_MARKETING·ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING·OVERSEAS_MARKETING·ALL 부서"))
                                .pathParameters(parameterWithName("date").description("수정 대상 날짜 (YYYY-MM-DD)"))
                                .requestFields(
                                        fieldWithPath("groupKey").description("그룹 키"),
                                        fieldWithPath("metricKey").description("지표 키"),
                                        fieldWithPath("value").description("셀 값 (0~99999)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.date").description("저장된 날짜"),
                                        fieldWithPath("data.groupKey").description("그룹 키"),
                                        fieldWithPath("data.metricKey").description("지표 키"),
                                        fieldWithPath("data.value").description("저장된 값"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .requestSchema(Schema.schema("OverseasReservationStatsUpdateRequest"))
                                .responseSchema(Schema.schema("OverseasReservationStatsUpdateResponse"))
                                .build())));
    }

    // ── 접수리스트 ─────────────────────────────────────────────

    @Test
    void receptions_get_문서화() throws Exception {
        mockMvc.perform(get("/api/overseas-marketing/receptions")
                        .param("from", "2026-08-01").param("to", "2026-08-31")
                        .param("dateType", "reg_date").param("source", "all")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-receptions-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("접수리스트 조회 (마트 + CRM 스냅샷)")
                                .description("overseas_marketing_sheet(구글시트 캐시 + 수기 입력)를 조회. "
                                        + "CRM 스냅샷은 화면 조회 시점에 파생값(상태·수술·비용·외래)으로 병합돼 있다 — 갱신은 sync-crm 버튼. "
                                        + "matchStatus: matched(고객번호 있음) / review(확인필요) / received(미매칭). "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작일 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("조회 종료일 (YYYY-MM-DD, 최대 366일)"),
                                        parameterWithName("dateType").description("날짜 기준 — reg_date(기본) · matched_date · inquiry_date · departure_schedule · exam_date · surgery_date"),
                                        parameterWithName("source").description("명단 구분 — all(기본) · manual · existing"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("접수 행 목록 (동적 스키마 — 시트 원본 컬럼 + CRM 스냅샷 파생값 병합)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasReceptionListResponse"))
                                .build())));
    }

    @Test
    void receptions_create_문서화() throws Exception {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("inquiryDate", "2026-09-01"); req.put("name", "Doe Jane");
        req.put("contact", "+82 10-1111-2222"); req.put("email", "jane@example.com");
        req.put("gender", "F"); req.put("dob", "1990-01-01"); req.put("nationality", "몽골");
        req.put("ethnicity", ""); req.put("occupation", ""); req.put("contactLens", "");
        req.put("medicalConditions", ""); req.put("medicationAllergy", "");
        req.put("departureSchedule", "2026-09-20"); req.put("examDate", "미정");
        req.put("surgeryDate", "미정"); req.put("surgeryCost", ""); req.put("channel", "Meta");
        req.put("onlineChannel", "instagram"); req.put("remark", "");
        String body = objectMapper.writeValueAsString(req);
        mockMvc.perform(post("/api/overseas-marketing/receptions")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andDo(document("overseas-receptions-create",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("접수 행 수기 추가")
                                .description("origin='manual' 로 저장. 추가자(created_by)는 로그인 ID. CRM 매칭은 sync-crm 배치 시점에 자동 시도. "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .requestFields(
                                        fieldWithPath("inquiryDate").description("문의일 (YYYY-MM-DD)"),
                                        fieldWithPath("name").description("이름 (필수, 최대 100자)"),
                                        fieldWithPath("contact").description("연락처"),
                                        fieldWithPath("email").description("이메일"),
                                        fieldWithPath("gender").description("성별"),
                                        fieldWithPath("dob").description("생년월일"),
                                        fieldWithPath("nationality").description("국적"),
                                        fieldWithPath("ethnicity").description("민족"),
                                        fieldWithPath("occupation").description("직업"),
                                        fieldWithPath("contactLens").description("콘택트렌즈 착용"),
                                        fieldWithPath("medicalConditions").description("병력"),
                                        fieldWithPath("medicationAllergy").description("복용약·알레르기"),
                                        fieldWithPath("departureSchedule").description("출국 예정"),
                                        fieldWithPath("examDate").description("검사일 (자유 서식 · '미정' 허용)"),
                                        fieldWithPath("surgeryDate").description("수술일"),
                                        fieldWithPath("surgeryCost").description("수술비"),
                                        fieldWithPath("channel").description("유입 채널"),
                                        fieldWithPath("onlineChannel").description("온라인 채널 세부"),
                                        fieldWithPath("remark").description("비고"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.rowNumber").description("발급된 행 번호"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .requestSchema(Schema.schema("OverseasReceptionUpsertRequest"))
                                .responseSchema(Schema.schema("OverseasReceptionRowNumberResponse"))
                                .build())));
    }

    @Test
    void receptions_update_문서화() throws Exception {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("inquiryDate", "2026-09-01"); req.put("name", "Doe Jane");
        req.put("contact", ""); req.put("email", ""); req.put("gender", "");
        req.put("dob", ""); req.put("nationality", ""); req.put("ethnicity", "");
        req.put("occupation", ""); req.put("contactLens", ""); req.put("medicalConditions", "");
        req.put("medicationAllergy", ""); req.put("departureSchedule", ""); req.put("examDate", "");
        req.put("surgeryDate", ""); req.put("surgeryCost", ""); req.put("channel", "");
        req.put("onlineChannel", ""); req.put("remark", "수정 테스트");
        String body = objectMapper.writeValueAsString(req);
        mockMvc.perform(put("/api/overseas-marketing/receptions/{rowNumber}", 42L)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andDo(document("overseas-receptions-update",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("접수 행 수정 (시트 원본 컬럼만)")
                                .description("수정자(updated_by) 는 로그인 ID. 자동 매칭 행은 매칭·스냅샷을 비워 다음 sync-crm 에서 재계산. "
                                        + "수동 매칭 행은 보존. MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .pathParameters(parameterWithName("rowNumber").description("수정 대상 행 번호"))
                                .requestFields(
                                        fieldWithPath("inquiryDate").description("문의일"),
                                        fieldWithPath("name").description("이름 (필수)"),
                                        fieldWithPath("contact").description("연락처"),
                                        fieldWithPath("email").description("이메일"),
                                        fieldWithPath("gender").description("성별"),
                                        fieldWithPath("dob").description("생년월일"),
                                        fieldWithPath("nationality").description("국적"),
                                        fieldWithPath("ethnicity").description("민족"),
                                        fieldWithPath("occupation").description("직업"),
                                        fieldWithPath("contactLens").description("콘택트렌즈"),
                                        fieldWithPath("medicalConditions").description("병력"),
                                        fieldWithPath("medicationAllergy").description("복용약·알레르기"),
                                        fieldWithPath("departureSchedule").description("출국 예정"),
                                        fieldWithPath("examDate").description("검사일"),
                                        fieldWithPath("surgeryDate").description("수술일"),
                                        fieldWithPath("surgeryCost").description("수술비"),
                                        fieldWithPath("channel").description("채널"),
                                        fieldWithPath("onlineChannel").description("온라인 채널 세부"),
                                        fieldWithPath("remark").description("비고"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.rowNumber").description("수정된 행 번호"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .requestSchema(Schema.schema("OverseasReceptionUpsertRequest"))
                                .responseSchema(Schema.schema("OverseasReceptionRowNumberResponse"))
                                .build())));
    }

    @Test
    void receptions_delete_문서화() throws Exception {
        mockMvc.perform(delete("/api/overseas-marketing/receptions/{rowNumber}", 42L)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-receptions-delete",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("접수 행 삭제")
                                .description("수기 행(origin='manual') 이고 locked_at 이 없어야 삭제 가능. "
                                        + "sync-sheet 가 지나간 행은 409 (RowLockedException). "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .pathParameters(parameterWithName("rowNumber").description("삭제 대상 행 번호"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.rowNumber").description("삭제된 행 번호"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasReceptionRowNumberResponse"))
                                .build())));
    }

    @Test
    void receptions_match_문서화() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("customerNo", "1234567890123"));
        mockMvc.perform(put("/api/overseas-marketing/receptions/{rowNumber}/match", 42L)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andDo(document("overseas-receptions-match",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("담당자 수동 매칭 확정")
                                .description("확인필요 확정 또는 접수 행 직접 매칭. matched_by 는 로그인 ID로 저장되며 이후 행 수정·시트 재동기화에도 보존. "
                                        + "저장 후 해당 행만 즉시 상세·비용 병합해 스냅샷까지 채운다. "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .pathParameters(parameterWithName("rowNumber").description("매칭 대상 행 번호"))
                                .requestFields(fieldWithPath("customerNo").description("CRM 고객번호 (숫자만, 최대 20자리)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("매칭 결과 (동적 — 행 번호·고객번호·매칭자·CRM 상세)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .requestSchema(Schema.schema("OverseasMatchConfirmRequest"))
                                .responseSchema(Schema.schema("OverseasMatchResponse"))
                                .build())));
    }

    // ── 통계 ────────────────────────────────────────────────────

    @Test
    void statistics_문서화() throws Exception {
        mockMvc.perform(get("/api/overseas-marketing/statistics")
                        .param("year", "2026").param("granularity", "month")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-statistics",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("해외마케팅 통계 (연간)")
                                .description("유입→검사·수술 월/주/일별 흐름, 국가별 수술, 검사·수술·외래·렌즈 매출. "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .queryParameters(
                                        parameterWithName("year").description("연도"),
                                        parameterWithName("granularity").description("집계 단위 — month(기본) · week · day"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.year").description("연도"),
                                        fieldWithPath("data.granularity").description("집계 단위"),
                                        fieldWithPath("data.buckets[].bucket").description("버킷 라벨"),
                                        fieldWithPath("data.buckets[].inquiries").description("문의 수"),
                                        fieldWithPath("data.buckets[].exams").description("검사 수"),
                                        fieldWithPath("data.buckets[].surgeries").description("수술 수"),
                                        fieldWithPath("data.buckets[].examRevenue").description("검사 매출 (원)"),
                                        fieldWithPath("data.buckets[].surgeryRevenue").description("수술 매출"),
                                        fieldWithPath("data.buckets[].outpatientRevenue").description("외래 매출"),
                                        fieldWithPath("data.buckets[].lensRevenue").description("렌즈 매출"),
                                        fieldWithPath("data.topCountries[].nationality").description("국적"),
                                        fieldWithPath("data.topCountries[].surgeries").description("해당 국가 수술 건수"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasStatisticsResponse"))
                                .build())));
    }

    // ── 시트 동기화 ────────────────────────────────────────────

    @Test
    void sync_sheet_문서화() throws Exception {
        mockMvc.perform(post("/api/overseas-marketing/sync-sheet")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-sync-sheet",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("Google Sheet 전체 동기화")
                                .description("origin='sheet' AND updated_by IS NULL AND (matched_by='CRM_Sync' or null) 인 행만 교체. "
                                        + "수기 행·수동 매칭 행·화면에서 수정된 행은 보존. 실행 후 모든 행에 locked_at 을 채워 삭제 잠금. "
                                        + "OVERSEAS_GOOGLE_SHEETS_SYNC_ENABLED=false 이면 syncer 빈이 없어 503. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.inserted").description("삽입된 행 수"),
                                        fieldWithPath("data.skipped").description("스킵된 행 수"),
                                        fieldWithPath("data.outOfRange").description("날짜 범위 밖 스킵"),
                                        fieldWithPath("data.failed").description("실패 행 수"),
                                        fieldWithPath("data.elapsedMillis").description("소요시간 (ms)"),
                                        fieldWithPath("data.message").description("요약 메시지"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasSyncSheetResponse"))
                                .build())));
    }

    @Test
    void sync_availability_문서화() throws Exception {
        mockMvc.perform(get("/api/overseas-marketing/sync-availability")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-sync-availability",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("시트 동기화 버튼 노출 여부")
                                .description("OVERSEAS_GOOGLE_SHEETS_SYNC_ENABLED 로 화면에서 [시트 동기화] 버튼을 숨기기 위한 여부만 응답. "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.enabled").description("시트 동기화 버튼 노출 여부"))
                                .responseSchema(Schema.schema("OverseasSyncAvailabilityResponse"))
                                .build())));
    }

    // ── CRM 동기화 ─────────────────────────────────────────────

    @Test
    void sync_crm_문서화() throws Exception {
        mockMvc.perform(post("/api/overseas-marketing/sync-crm")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-sync-crm",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("CRM 동기화 백그라운드 잡 시작 — ADMIN")
                                .description("CUSTOM 스트림 매칭 + 스냅샷 병합. 단일 실행 락 — 이미 실행 중이면 시작 없이 현재 상태 반환. "
                                        + "진행·결과는 sync-crm/status 로 폴링. "
                                        + "SecurityConfig 매처: `POST /api/overseas-marketing/sync-crm` 는 `hasRole('ADMIN')` — "
                                        + "부서 gate(MARKETING·OVERSEAS_MARKETING)보다 좁은 ADMIN 롤이 우선 적용된다. "
                                        + "무거운 외부 조회(MSSQL SOFTCRM) 실수·남용 방지 목적.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 롤 필수"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("현재 잡 상태 (state · phase · startedAt 등, sync-crm/status 와 동일 스키마)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasSyncCrmResponse"))
                                .build())));
    }

    @Test
    void sync_crm_status_문서화() throws Exception {
        mockMvc.perform(get("/api/overseas-marketing/sync-crm/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-sync-crm-status",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("CRM 동기화 잡 상태 폴링")
                                .description("state: idle / running(phase, startedAt) / done(matched, review, elapsedMs) / error(message). "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("잡 상태 (동적 — state 에 따라 필드가 다름)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasSyncCrmStatusResponse"))
                                .build())));
    }

    @Test
    void crm_customer_문서화() throws Exception {
        mockMvc.perform(get("/api/overseas-marketing/crm-customers/{customerNo}", "1234567890123")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overseas-crm-customer-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("OverseasMarketing")
                                .summary("CRM 고객 단건 조회 (수동 매칭 검증)")
                                .description("customerNo 유효성 검증(숫자 1~20자리) 후 CRM 조회. 없으면 400. "
                                        + "MARKETING·OVERSEAS_MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 gate"))
                                .pathParameters(parameterWithName("customerNo").description("CRM 고객번호 (숫자만)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("CRM 고객 상세 (customerNo · name · birthDate · contact · email)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("OverseasCrmCustomerResponse"))
                                .build())));
    }
}
