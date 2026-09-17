package com.bviit.analytics.reservation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.controller.CataractStatsSystemController;
import com.bviit.analytics.reservation.dto.CataractStatsCellEdit;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffItem;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownRow;
import com.bviit.analytics.reservation.dto.ReservationStatsParityItem;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.service.CataractStatsSystemQueryService;
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
import java.util.List;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
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
 * /api/stats/reservation-stats-cataract/** 6개 엔드포인트 문서화 (예약통계_백내장 · RESERVE_FLAG='H').
 *
 * 시력교정과 동일 구조 — 마트 조회 + override 오버레이 + MSSQL 진단. 채널 구성이 시력교정과 달라
 * 별도 스키마(CataractStatsDailyRow). 컨트롤러·QueryService 모두 @Profile("postgres-mart") 라
 * @TestConfiguration 으로 mock 을 명시 등록.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-cataract-stats-system-docs-1234567890",
        "spring.datasource.url=jdbc:h2:mem:cataract-stats-system-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
@Import(CataractStatsSystemDocsTest.TestConfig.class)
class CataractStatsSystemDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired CataractStatsSystemQueryService queryService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubService() {
        Mockito.reset(queryService);

        CataractStatsDailyRow row = new CataractStatsDailyRow(
                "2026-07-01",
                18, 6,           // totalCataract, totalPresbyopia
                22, 20,          // inboundCall, answeredCall
                12, 3, 4,        // newExamInquiry, newReInquiry, newPatient
                40, 25, 10,      // tmTotalDb, tmValidDb, tmReservation
                8, 5, 2,         // kakaoTotal/Cataract/Presbyopia
                6, 1,            // onlineReservation, onlineNoShow
                2, 3, 1,         // cancelOnline, cancelCrm, cancelKakao
                24, 2, 3);       // visit, noShowReservation, cancel
        Mockito.when(queryService.getDailyCounts(any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenReturn(new ReservationStatsResult<>(List.of(row),
                        StatsResponseMeta.mart("2026-07", "reservation-stats-cataract-v1", 1)));

        CataractStatsDailyRow edited = new CataractStatsDailyRow(
                "2026-07-01",
                18, 6,
                24, 22,          // inbound/answered 손보정
                12, 3, 4,
                40, 25, 10,
                8, 5, 2,
                6, 1,
                2, 3, 1,
                24, 2, 3,
                List.of(new CataractStatsCellEdit(
                        "inboundCall", 24, "docs-tester", "2026-09-16T10:32:11")));
        Mockito.when(queryService.editCell(anyString(), anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(edited);

        Mockito.when(queryService.diff(anyString())).thenReturn(new ReservationStatsDiffResponse(
                "2026-07", true, "2026-07-01", "2026-07-31", 0,
                List.of(new ReservationStatsDiffItem("2026-07-15", "inboundCall", "인입콜", 20, 24, 4))));

        Mockito.when(queryService.drillDown(anyString(), anyString(), anyString()))
                .thenReturn(new ReservationStatsDrillDownResponse(
                        "2026-07", "2026-07-15", "inboundCall", "인입콜",
                        true, 20, 24, 4, 0,
                        List.of(new ReservationStatsDrillDownRow(
                                "2026-07-15", "inboundCall", "EICN",
                                "IN", null, "call-20260715-0001",
                                null, null, null, null, 1))));

        Mockito.when(queryService.parity(anyString(), anyString()))
                .thenReturn(new ReservationStatsParityResponse(
                        "2026-07", "inboundCall", "인입콜",
                        "2026-07-01", "2026-07-31", 0,
                        List.of(new ReservationStatsParityItem(
                                "2026-07-15", "inboundCall", "인입콜", 24, 24, 0, 24))));

        Mockito.when(queryService.health(anyString()))
                .thenReturn(new ReservationStatsDiagnosticsHealthResponse(
                        "2026-07", "cataract", StatsResponseMeta.Source.MART,
                        false, true, false, false, 1, 0, null, null, null,
                        "reservation-stats-cataract-v1", "2026-09-16T10:32:11"));
    }

    @Test
    void cataract_stats_system_daily_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-cataract")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-stats-system-daily",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("CataractStatsSystem")
                                .summary("예약통계_백내장 — 일자별 원시 카운트")
                                .description("백내장(노안 포함) 검사예약을 인바운드(컨택센터)·아웃바운드(TM)·채팅(카톡)·온라인·취소 채널로 분해. "
                                        + "비율·합계는 프론트가 일→주→월 집계 후 계산. 채널 구성이 시력교정과 달라 별도 스키마. "
                                        + "최대 92일, 마트 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("조회 종료 (YYYY-MM-DD, 최대 92일)"))
                                .responseFields(cataractDailyListFields())
                                .responseSchema(Schema.schema("CataractStatsSystemDailyListResponse"))
                                .build())));
    }

    @Test
    void cataract_stats_system_cell_문서화() throws Exception {
        mockMvc.perform(post("/api/stats/reservation-stats-cataract/cell")
                        .queryParam("period", "2026-07")
                        .queryParam("date", "2026-07-01")
                        .queryParam("field", "inboundCall")
                        .queryParam("value", "24")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-stats-system-cell",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("CataractStatsSystem")
                                .summary("셀 손보정 (인입콜/응대콜)")
                                .description("휴가 등으로 EICN group_code 라이브 집계가 어긋나는 날의 인입콜/응대콜을 PDF/레거시 값으로 손보정. "
                                        + "reservation_stats_override 에 INSERT-only 로 이력 append.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("period").description("월 (YYYY-MM)"),
                                        parameterWithName("date").description("일자 (YYYY-MM-DD)"),
                                        parameterWithName("field").description("필드명 — inboundCall|answeredCall"),
                                        parameterWithName("value").description("적용할 값"))
                                .responseFields(cataractDailyRowFields())
                                .responseSchema(Schema.schema("CataractStatsSystemDailyRowResponse"))
                                .build())));
    }

    @Test
    void cataract_stats_system_diff_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-cataract/diagnostics/diff")
                        .param("period", "2026-07")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-stats-system-diff",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("CataractStatsSystem")
                                .summary("진단 — 스냅샷 vs 라이브 diff (백내장)")
                                .description("월간 스냅샷과 라이브 재조회 결과의 차이. 진단 MSSQL 서비스 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(parameterWithName("period").description("월 (YYYY-MM)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.period").description("월"),
                                        fieldWithPath("data.snapshotExists").description("스냅샷 존재 여부"),
                                        fieldWithPath("data.liveFrom").description("라이브 재조회 시작일"),
                                        fieldWithPath("data.liveTo").description("라이브 재조회 종료일"),
                                        fieldWithPath("data.diffCount").description("차이 발생 건수"),
                                        subsectionWithPath("data.diffs").description("차이 항목 배열 — {date, field, label, snapshotValue, liveValue, delta}"))
                                .responseSchema(Schema.schema("ReservationStatsDiffResponse"))
                                .build())));
    }

    @Test
    void cataract_stats_system_drill_down_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-cataract/diagnostics/drill-down")
                        .param("period", "2026-07")
                        .param("date", "2026-07-15")
                        .param("field", "inboundCall")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-stats-system-drill-down",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("CataractStatsSystem")
                                .summary("진단 — 특정 일자/필드 원천 row 후보 (백내장)")
                                .description("diff 결과의 근거 row 를 원천에서 재조회. MSSQL 진단 서비스 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("period").description("월 (YYYY-MM)"),
                                        parameterWithName("date").description("일자 (YYYY-MM-DD)"),
                                        parameterWithName("field").description("필드명"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.period").description("월"),
                                        fieldWithPath("data.date").description("일자"),
                                        fieldWithPath("data.field").description("필드명"),
                                        fieldWithPath("data.label").description("필드 표시명"),
                                        fieldWithPath("data.snapshotExists").description("스냅샷 존재 여부"),
                                        fieldWithPath("data.snapshotValue").description("스냅샷 값").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.liveValue").description("라이브 재조회 값").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.delta").description("liveValue - snapshotValue").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data.rowCount").description("행 수"),
                                        subsectionWithPath("data.rows").description("원천 row 후보 — {date, field, source, gb, gb2, primaryKey, custNum, reserveNum, reserveState, exclusionReasonCandidate, contribution}"))
                                .responseSchema(Schema.schema("ReservationStatsDrillDownResponse"))
                                .build())));
    }

    @Test
    void cataract_stats_system_parity_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-cataract/diagnostics/parity")
                        .param("period", "2026-07")
                        .param("field", "inboundCall")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-stats-system-parity",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("CataractStatsSystem")
                                .summary("진단 — daily vs drill-down parity (백내장)")
                                .description("같은 월/필드에서 daily SQL 집계값과 drill-down row 기여도 합계 일치 여부.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("period").description("월 (YYYY-MM)"),
                                        parameterWithName("field").description("필드명"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.period").description("월"),
                                        fieldWithPath("data.field").description("필드명"),
                                        fieldWithPath("data.label").description("필드 표시명"),
                                        fieldWithPath("data.liveFrom").description("검증 시작일"),
                                        fieldWithPath("data.liveTo").description("검증 종료일"),
                                        fieldWithPath("data.mismatchCount").description("불일치 일수"),
                                        subsectionWithPath("data.items").description("일자별 parity — {date, field, label, dailyValue, drillDownValue, delta, rowCount}"))
                                .responseSchema(Schema.schema("ReservationStatsParityResponse"))
                                .build())));
    }

    @Test
    void cataract_stats_system_health_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-cataract/diagnostics/health")
                        .param("period", "2026-07")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("cataract-stats-system-health",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("CataractStatsSystem")
                                .summary("진단 — 운영 상태 점검 (백내장)")
                                .description("statsType='cataract' 로 반환. 그 외 스키마는 시력교정과 동일.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(parameterWithName("period").description("월 (YYYY-MM)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.period").description("월"),
                                        fieldWithPath("data.statsType").description("통계 유형 (cataract)"),
                                        fieldWithPath("data.currentSource").description("현재 출처 — MART|LIVE|UNAVAILABLE"),
                                        fieldWithPath("data.liveServiceAvailable").description("라이브 서비스 연결 여부 (false 고정)"),
                                        fieldWithPath("data.diagnosticServiceAvailable").description("진단 MSSQL 서비스 연결 여부"),
                                        fieldWithPath("data.snapshotExists").description("스냅샷 존재 여부 (false 고정)"),
                                        fieldWithPath("data.snapshotLocked").description("스냅샷 잠금 여부"),
                                        fieldWithPath("data.schemaVersion").description("스키마 버전"),
                                        fieldWithPath("data.dayCount").description("일수 (range 기반이라 0)"),
                                        fieldWithPath("data.latestDate").description("최신 일자").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data.confirmedAt").description("확정 시각").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data.confirmedBy").description("확정자").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data.formulaVersion").description("공식 버전"),
                                        fieldWithPath("data.checkedAt").description("점검 시각 ISO-8601"))
                                .responseSchema(Schema.schema("ReservationStatsDiagnosticsHealthResponse"))
                                .build())));
    }

    // ─── 공용 필드 스니펫 ────────────────────────────────────────

    private static org.springframework.restdocs.payload.FieldDescriptor[] cataractDailyListFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].date").description("예약(등록)일 YYYY-MM-DD"),
                fieldWithPath("data[].totalCataract").description("백내장 총예약 (아웃바운드 포함)"),
                fieldWithPath("data[].totalPresbyopia").description("노안 총예약"),
                fieldWithPath("data[].inboundCall").description("총 인입콜"),
                fieldWithPath("data[].answeredCall").description("응대콜"),
                fieldWithPath("data[].newExamInquiry").description("백내장 총 신규검사문의"),
                fieldWithPath("data[].newReInquiry").description("백내장 신규 재문의"),
                fieldWithPath("data[].newPatient").description("백내장 ★신환"),
                fieldWithPath("data[].tmTotalDb").description("TM 총 DB"),
                fieldWithPath("data[].tmValidDb").description("TM 유효 DB"),
                fieldWithPath("data[].tmReservation").description("TM 예약수"),
                fieldWithPath("data[].kakaoTotalInquiry").description("카톡 총문의 (모든)"),
                fieldWithPath("data[].kakaoCataractReservation").description("카톡 백내장 검사예약"),
                fieldWithPath("data[].kakaoPresbyopiaReservation").description("카톡 노안 검사예약"),
                fieldWithPath("data[].onlineReservation").description("온라인 예약수"),
                fieldWithPath("data[].onlineNoShow").description("온라인 부도수"),
                fieldWithPath("data[].cancelOnline").description("취소 — 온라인"),
                fieldWithPath("data[].cancelCrm").description("취소 — 컨택센터 현장(CRM)"),
                fieldWithPath("data[].cancelKakao").description("취소 — 카톡"),
                fieldWithPath("data[].visit").description("내원 (방문일 기준)"),
                fieldWithPath("data[].noShowReservation").description("예약 (부도)"),
                fieldWithPath("data[].cancel").description("취소 (종합)"),
                subsectionWithPath("data[].manualEdits").description("수기 보정 이력 배열 (비어있으면 생략) — {field, value, editedBy, editedAt}")
                        .optional().type(JsonFieldType.ARRAY),
                subsectionWithPath("meta").description("응답 메타 — source=MART, period, schemaVersion, formulaVersion")
        };
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] cataractDailyRowFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data.date").description("예약(등록)일 YYYY-MM-DD"),
                fieldWithPath("data.totalCataract").description("백내장 총예약"),
                fieldWithPath("data.totalPresbyopia").description("노안 총예약"),
                fieldWithPath("data.inboundCall").description("총 인입콜 (손보정 반영)"),
                fieldWithPath("data.answeredCall").description("응대콜"),
                fieldWithPath("data.newExamInquiry").description("백내장 총 신규검사문의"),
                fieldWithPath("data.newReInquiry").description("백내장 신규 재문의"),
                fieldWithPath("data.newPatient").description("백내장 ★신환"),
                fieldWithPath("data.tmTotalDb").description("TM 총 DB"),
                fieldWithPath("data.tmValidDb").description("TM 유효 DB"),
                fieldWithPath("data.tmReservation").description("TM 예약수"),
                fieldWithPath("data.kakaoTotalInquiry").description("카톡 총문의"),
                fieldWithPath("data.kakaoCataractReservation").description("카톡 백내장 검사예약"),
                fieldWithPath("data.kakaoPresbyopiaReservation").description("카톡 노안 검사예약"),
                fieldWithPath("data.onlineReservation").description("온라인 예약수"),
                fieldWithPath("data.onlineNoShow").description("온라인 부도수"),
                fieldWithPath("data.cancelOnline").description("취소 — 온라인"),
                fieldWithPath("data.cancelCrm").description("취소 — 컨택센터 현장"),
                fieldWithPath("data.cancelKakao").description("취소 — 카톡"),
                fieldWithPath("data.visit").description("내원"),
                fieldWithPath("data.noShowReservation").description("예약 (부도)"),
                fieldWithPath("data.cancel").description("취소"),
                subsectionWithPath("data.manualEdits").description("수기 보정 이력 — 방금 저장된 값 포함 {field, value, editedBy, editedAt}")
                        .optional().type(JsonFieldType.ARRAY)
        };
    }

    /**
     * 컨트롤러와 QueryService 모두 @Profile("postgres-mart") 라 mock 을 명시 등록.
     */
    @TestConfiguration
    static class TestConfig {
        @Bean CataractStatsSystemQueryService cataractStatsSystemQueryService() {
            return Mockito.mock(CataractStatsSystemQueryService.class);
        }
        @Bean CataractStatsSystemController cataractStatsSystemController(
                CataractStatsSystemQueryService queryService) {
            return new CataractStatsSystemController(queryService);
        }
    }
}
