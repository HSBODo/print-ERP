package com.bviit.analytics.reservation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.controller.ReservationStatsSystemController;
import com.bviit.analytics.reservation.dto.ReservationStatsCellEdit;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffItem;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownRow;
import com.bviit.analytics.reservation.dto.ReservationStatsParityItem;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.service.ReservationStatsSystemQueryService;
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
 * /api/stats/reservation-stats-system/** 6개 엔드포인트 문서화 (예약통계_시력교정 · BCRM RSS 컨택통계).
 *
 * 컨트롤러 · QueryService 모두 @Profile("postgres-mart") — @TestConfiguration 으로 mock QueryService 를
 * 등록하고 그 위에 컨트롤러를 명시적으로 만든다 (BatchAdminDocsTest 와 동일 패턴).
 * 셀 수기 보정 이력(manualEdits) 은 JsonInclude(NON_EMPTY) 라 응답에서 생략될 수 있어 .optional() 표기.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reservation-stats-system-docs-1234567890",
        "spring.datasource.url=jdbc:h2:mem:reservation-stats-system-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
@Import(ReservationStatsSystemDocsTest.TestConfig.class)
class ReservationStatsSystemDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired ReservationStatsSystemQueryService queryService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubService() {
        Mockito.reset(queryService);

        ReservationStatsDailyRow row = new ReservationStatsDailyRow(
                "2026-07-01",
                42, 38, 12, 30,
                80, 50, 25,
                10, 6, 4,
                18, 12,
                20, 3, 17, 15,
                5, 2,
                4, 2, 1,
                180, 8, 6);
        Mockito.when(queryService.getDailyCounts(any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenReturn(new ReservationStatsResult<>(List.of(row),
                        StatsResponseMeta.mart("2026-07", "reservation-stats-system-v1", 1)));

        ReservationStatsDailyRow edited = new ReservationStatsDailyRow(
                "2026-07-01",
                42, 38, 12, 30,
                80, 50, 25,
                10, 6, 4,
                18, 14,        // homeReservation 손보정 12 → 14
                20, 3, 17, 15,
                5, 2,
                4, 2, 1,
                180, 8, 6,
                List.of(new ReservationStatsCellEdit(
                        "homeReservation", 14, "docs-tester", "2026-09-16T10:32:11")));
        Mockito.when(queryService.editCell(anyString(), anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(edited);

        Mockito.when(queryService.diff(anyString())).thenReturn(new ReservationStatsDiffResponse(
                "2026-07", true, "2026-07-01", "2026-07-31", 0,
                List.of(new ReservationStatsDiffItem("2026-07-15", "homeReservation", "홈페이지 예약수", 12, 14, 2))));

        Mockito.when(queryService.drillDown(anyString(), anyString(), anyString()))
                .thenReturn(new ReservationStatsDrillDownResponse(
                        "2026-07", "2026-07-15", "homeReservation", "홈페이지 예약수",
                        true, 12, 14, 2, 0,
                        List.of(new ReservationStatsDrillDownRow(
                                "2026-07-15", "homeReservation", "RESERVATION",
                                "ONLINE", "APP", "R202607150042",
                                "1234567890123", "R202607150042", "Y", null, 1))));

        Mockito.when(queryService.parity(anyString(), anyString()))
                .thenReturn(new ReservationStatsParityResponse(
                        "2026-07", "homeReservation", "홈페이지 예약수",
                        "2026-07-01", "2026-07-31", 0,
                        List.of(new ReservationStatsParityItem(
                                "2026-07-15", "homeReservation", "홈페이지 예약수", 14, 14, 0, 14))));

        Mockito.when(queryService.health(anyString()))
                .thenReturn(new ReservationStatsDiagnosticsHealthResponse(
                        "2026-07", "system", StatsResponseMeta.Source.MART,
                        false, true, false, false, 1, 0, null, null, null,
                        "reservation-stats-system-v1", "2026-09-16T10:32:11"));
    }

    @Test
    void reservation_stats_system_daily_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-system")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-stats-system-daily",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationStatsSystem")
                                .summary("예약통계_시력교정 — 일자별 원시 카운트")
                                .description("BCRM RSS 컨택통계 내부 집계(Z.CH01~CH24)를 그대로 노출. "
                                        + "비율·총예약 등 파생값은 프론트가 일→주→월 집계 후 계산. 최대 92일. "
                                        + "SecurityConfig 홈 예외 매처 — MEDICAL·MARKETING·OVERSEAS_MARKETING·ALL 모두 접근 가능(부서 무관). "
                                        + "마트 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 무관 (홈 대시보드 개방)"))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("조회 종료 (YYYY-MM-DD, 최대 92일)"))
                                .responseFields(commonDailyFields())
                                .responseSchema(Schema.schema("ReservationStatsSystemDailyListResponse"))
                                .build())));
    }

    @Test
    void reservation_stats_system_cell_문서화() throws Exception {
        mockMvc.perform(post("/api/stats/reservation-stats-system/cell")
                        .queryParam("period", "2026-07")
                        .queryParam("date", "2026-07-01")
                        .queryParam("field", "homeReservation")
                        .queryParam("value", "14")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-stats-system-cell",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationStatsSystem")
                                .summary("셀 손보정 (온라인예약 6개 필드)")
                                .description("홈페이지·네이버 온라인예약 원시 카운트 6개(homeReceived·homeReservation·"
                                        + "naverReceived·naverRejected·naverValid·naverReservation)를 PDF/레거시 값으로 직접 고친다. "
                                        + "reservation_stats_override 에 INSERT-only 로 이력 append — 원본 마트는 손대지 않는다.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("period").description("월 (YYYY-MM)"),
                                        parameterWithName("date").description("일자 (YYYY-MM-DD)"),
                                        parameterWithName("field").description("필드명 — homeReceived|homeReservation|naverReceived|naverRejected|naverValid|naverReservation"),
                                        parameterWithName("value").description("적용할 값 (정수)"))
                                .responseFields(commonDailyRowFields())
                                .responseSchema(Schema.schema("ReservationStatsSystemDailyRowResponse"))
                                .build())));
    }

    @Test
    void reservation_stats_system_diff_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-system/diagnostics/diff")
                        .param("period", "2026-07")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-stats-system-diff",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationStatsSystem")
                                .summary("진단 — 스냅샷 vs 라이브 diff")
                                .description("월간 스냅샷(확정)과 라이브 재조회 결과의 일자/필드 단위 차이. "
                                        + "진단용 MSSQL 서비스 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(parameterWithName("period").description("월 (YYYY-MM)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.period").description("월"),
                                        fieldWithPath("data.snapshotExists").description("스냅샷 존재 여부"),
                                        fieldWithPath("data.liveFrom").description("라이브 재조회 시작일"),
                                        fieldWithPath("data.liveTo").description("라이브 재조회 종료일"),
                                        fieldWithPath("data.diffCount").description("차이 발생 건수 (= diffs.length)"),
                                        subsectionWithPath("data.diffs").description("차이 항목 배열 — {date, field, label, snapshotValue, liveValue, delta}"))
                                .responseSchema(Schema.schema("ReservationStatsDiffResponse"))
                                .build())));
    }

    @Test
    void reservation_stats_system_drill_down_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-system/diagnostics/drill-down")
                        .param("period", "2026-07")
                        .param("date", "2026-07-15")
                        .param("field", "homeReservation")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-stats-system-drill-down",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationStatsSystem")
                                .summary("진단 — 특정 일자/필드 원천 row 후보")
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
                                        fieldWithPath("data.rowCount").description("행 수 (= rows.length)"),
                                        subsectionWithPath("data.rows").description("원천 row 후보 — {date, field, source, gb, gb2, primaryKey, custNum, reserveNum, reserveState, exclusionReasonCandidate, contribution}"))
                                .responseSchema(Schema.schema("ReservationStatsDrillDownResponse"))
                                .build())));
    }

    @Test
    void reservation_stats_system_parity_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-system/diagnostics/parity")
                        .param("period", "2026-07")
                        .param("field", "homeReservation")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-stats-system-parity",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationStatsSystem")
                                .summary("진단 — daily vs drill-down parity")
                                .description("같은 월/필드에서 daily SQL 집계값과 drill-down SQL row 기여도 합계 일치 여부.")
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
    void reservation_stats_system_health_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-stats-system/diagnostics/health")
                        .param("period", "2026-07")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-stats-system-health",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationStatsSystem")
                                .summary("진단 — 운영 상태 점검")
                                .description("현재 월이 스냅샷으로 고정돼 있는지, 라이브 MSSQL/진단 서비스가 붙어 있는지 경량 확인.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(parameterWithName("period").description("월 (YYYY-MM)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.period").description("월"),
                                        fieldWithPath("data.statsType").description("통계 유형 (system|cataract)"),
                                        fieldWithPath("data.currentSource").description("현재 출처 — SNAPSHOT|LIVE|MART|UNAVAILABLE"),
                                        fieldWithPath("data.liveServiceAvailable").description("라이브 서비스 연결 여부 (마트 이관 후 무의미 · false 고정)"),
                                        fieldWithPath("data.diagnosticServiceAvailable").description("진단(MSSQL) 서비스 연결 여부"),
                                        fieldWithPath("data.snapshotExists").description("스냅샷 존재 여부 (파일 스냅샷 폐기 · false 고정)"),
                                        fieldWithPath("data.snapshotLocked").description("스냅샷 잠금 여부"),
                                        fieldWithPath("data.schemaVersion").description("스키마 버전"),
                                        fieldWithPath("data.dayCount").description("일수 (마트 조회는 range 기반이라 0)"),
                                        fieldWithPath("data.latestDate").description("최신 일자").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data.confirmedAt").description("확정 시각").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data.confirmedBy").description("확정자").optional().type(JsonFieldType.STRING),
                                        fieldWithPath("data.formulaVersion").description("공식 버전"),
                                        fieldWithPath("data.checkedAt").description("점검 시각 ISO-8601"))
                                .responseSchema(Schema.schema("ReservationStatsDiagnosticsHealthResponse"))
                                .build())));
    }

    // ─── 공용 필드 스니펫 ────────────────────────────────────────

    /** GET / 응답 = ApiResponse<List<ReservationStatsDailyRow>> + meta. */
    private static org.springframework.restdocs.payload.FieldDescriptor[] commonDailyFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].date").description("예약(등록)일 YYYY-MM-DD"),
                fieldWithPath("data[].inboundCall").description("CH01 검사 인입콜 (EICN)"),
                fieldWithPath("data[].answeredCall").description("CH02 검사 응대콜 (EICN)"),
                fieldWithPath("data[].newInquiry").description("CH03 검사 신규예약문의"),
                fieldWithPath("data[].callReservation").description("CH04 검사 예약수"),
                fieldWithPath("data[].tmTotalDb").description("CH05 TM 총DB"),
                fieldWithPath("data[].tmValidDb").description("CH06 TM 유효DB"),
                fieldWithPath("data[].tmReservation").description("CH07 TM 예약수"),
                fieldWithPath("data[].tmRecounsel").description("CH08 TM 재상담"),
                fieldWithPath("data[].tmRecounselValid").description("CH09 TM 재상담 유효수"),
                fieldWithPath("data[].tmRecounselReservation").description("CH10 TM 재상담 예약수"),
                fieldWithPath("data[].homeReceived").description("CH11 홈페이지 예약접수"),
                fieldWithPath("data[].homeReservation").description("CH12 홈페이지 예약수"),
                fieldWithPath("data[].naverReceived").description("CH13 네이버 예약접수"),
                fieldWithPath("data[].naverRejected").description("CH14 네이버 파트너거절"),
                fieldWithPath("data[].naverValid").description("CH15 네이버 유효접수 (일별 음수 가능, 프론트가 0 클램프)"),
                fieldWithPath("data[].naverReservation").description("CH16 네이버 예약수"),
                fieldWithPath("data[].kakaoInquiry").description("CH17 카카오톡 문의"),
                fieldWithPath("data[].kakaoReservation").description("CH18 카카오톡 예약수"),
                fieldWithPath("data[].cancelCallNaver").description("CH19 취소 콜·네이버"),
                fieldWithPath("data[].cancelHome").description("CH20 취소 홈페이지"),
                fieldWithPath("data[].cancelKakao").description("CH21 취소 카톡"),
                fieldWithPath("data[].visit").description("CH22 내원"),
                fieldWithPath("data[].noShowReservation").description("CH23 예약(부도)"),
                fieldWithPath("data[].cancel").description("CH24 취소"),
                subsectionWithPath("data[].manualEdits").description("수기 보정 이력 배열 (비어있으면 생략) — {field, value, editedBy, editedAt}")
                        .optional().type(JsonFieldType.ARRAY),
                subsectionWithPath("meta").description("응답 메타 — source=MART, period, schemaVersion, formulaVersion")
        };
    }

    /** POST /cell 응답 = ApiResponse<ReservationStatsDailyRow> (단건). */
    private static org.springframework.restdocs.payload.FieldDescriptor[] commonDailyRowFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data.date").description("예약(등록)일 YYYY-MM-DD"),
                fieldWithPath("data.inboundCall").description("CH01 검사 인입콜"),
                fieldWithPath("data.answeredCall").description("CH02 검사 응대콜"),
                fieldWithPath("data.newInquiry").description("CH03 검사 신규예약문의"),
                fieldWithPath("data.callReservation").description("CH04 검사 예약수"),
                fieldWithPath("data.tmTotalDb").description("CH05 TM 총DB"),
                fieldWithPath("data.tmValidDb").description("CH06 TM 유효DB"),
                fieldWithPath("data.tmReservation").description("CH07 TM 예약수"),
                fieldWithPath("data.tmRecounsel").description("CH08 TM 재상담"),
                fieldWithPath("data.tmRecounselValid").description("CH09 TM 재상담 유효수"),
                fieldWithPath("data.tmRecounselReservation").description("CH10 TM 재상담 예약수"),
                fieldWithPath("data.homeReceived").description("CH11 홈페이지 예약접수"),
                fieldWithPath("data.homeReservation").description("CH12 홈페이지 예약수 (손보정 반영)"),
                fieldWithPath("data.naverReceived").description("CH13 네이버 예약접수"),
                fieldWithPath("data.naverRejected").description("CH14 네이버 파트너거절"),
                fieldWithPath("data.naverValid").description("CH15 네이버 유효접수"),
                fieldWithPath("data.naverReservation").description("CH16 네이버 예약수"),
                fieldWithPath("data.kakaoInquiry").description("CH17 카카오톡 문의"),
                fieldWithPath("data.kakaoReservation").description("CH18 카카오톡 예약수"),
                fieldWithPath("data.cancelCallNaver").description("CH19 취소 콜·네이버"),
                fieldWithPath("data.cancelHome").description("CH20 취소 홈페이지"),
                fieldWithPath("data.cancelKakao").description("CH21 취소 카톡"),
                fieldWithPath("data.visit").description("CH22 내원"),
                fieldWithPath("data.noShowReservation").description("CH23 예약(부도)"),
                fieldWithPath("data.cancel").description("CH24 취소"),
                subsectionWithPath("data.manualEdits").description("수기 보정 이력 — 방금 저장된 값 포함 {field, value, editedBy, editedAt}")
                        .optional().type(JsonFieldType.ARRAY)
        };
    }

    /**
     * 컨트롤러와 QueryService 모두 @Profile("postgres-mart") — 기본 프로파일에서 빈이 안 생기니
     * mock QueryService 를 만들고 그 위에 컨트롤러를 명시적으로 등록.
     */
    @TestConfiguration
    static class TestConfig {
        @Bean ReservationStatsSystemQueryService reservationStatsSystemQueryService() {
            return Mockito.mock(ReservationStatsSystemQueryService.class);
        }
        @Bean ReservationStatsSystemController reservationStatsSystemController(
                ReservationStatsSystemQueryService queryService) {
            return new ReservationStatsSystemController(queryService);
        }
    }
}
