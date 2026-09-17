package com.bviit.analytics.reservation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.reservation.dto.ReservationChangeDailyResult;
import com.bviit.analytics.reservation.dto.ReservationChangeResult;
import com.bviit.analytics.reservation.service.ReservationChangeReader;
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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
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
 * 예약 변경이력 2개 엔드포인트 문서화.
 *
 *   - /api/reservation-change            — 변경된 예약 명단 (등록일 범위, 최대 3660일)
 *   - /api/reservation-change/daily      — 추이 달력 (일별 등록·변경 건수, 최대 366일)
 *
 * 화면은 마트만 읽는다 — MSSQL 직결 구현 없음. 마트 미연결 시 503.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reservation-change-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:reservation-change-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ReservationChangeDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ReservationChangeReader reservationChangeReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubReader() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("reserveNum", "R202607200042");
        row.put("registeredAt", "2026-07-20");
        row.put("registeredTime", "09:15");
        row.put("regSource", "I");
        row.put("chartNo", "C0000123");
        row.put("name", "홍길동");
        row.put("branch", "강남");
        row.put("reserveState", "Y");
        row.put("firstDate", "2026-07-25");
        row.put("finalDate", "2026-08-03");
        row.put("changeCount", 2);
        row.put("changeChain", "2026-07-21 10:00@2026-07-25|2026-07-30 14:30@2026-08-03");
        row.put("lastChangedAt", "2026-07-30 14:30");
        when(reservationChangeReader.getReservationChanges(anyString(), anyString()))
                .thenReturn(new ReservationChangeResult(List.of(row)));

        Map<String, Object> regDay = new LinkedHashMap<>();
        regDay.put("day", "2026-07-20");
        regDay.put("branch", "강남");
        regDay.put("total", 40);
        regDay.put("changed", 8);
        Map<String, Object> resDay = new LinkedHashMap<>();
        resDay.put("day", "2026-07-25");
        resDay.put("branch", "강남");
        resDay.put("total", 55);
        resDay.put("changed", 12);
        when(reservationChangeReader.getDailyCounts(anyString(), anyString()))
                .thenReturn(new ReservationChangeDailyResult(List.of(regDay), List.of(resDay)));
    }

    @Test
    void reservation_change_문서화() throws Exception {
        mockMvc.perform(get("/api/reservation-change")
                        .param("from", "2026-01-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-change",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Reservation")
                                .summary("예약 변경이력 명단")
                                .description("예약일이 1회 이상 바뀐 검사예약 (등록일 범위). "
                                        + "명단은 change_count ≥ 1 만 담겨 2022년부터 전부 합쳐도 3만 행 안쪽 — 범위 상한 3660일. "
                                        + "체인 해석은 프론트가 changeChain 문자열로 수행. 마트 미연결 시 503. "
                                        + "MEDICAL·ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("등록일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("등록일 종료 (YYYY-MM-DD, 최대 3660일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data.rows")
                                                .description("변경된 예약 행 — camelCase 키. 핵심 키: reserveNum, registeredAt/Time, "
                                                        + "regSource(H|I|N), chartNo, name, branch, reserveState, firstDate, "
                                                        + "finalDate, changeCount, changeChain(\"YYYY-MM-DD HH:MM@YYYY-MM-DD|…\"), "
                                                        + "lastChangedAt. 전체 계약은 ReservationChangeRow 참조."),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationChangeResponse"))
                                .build())));
    }

    @Test
    void reservation_change_daily_문서화() throws Exception {
        mockMvc.perform(get("/api/reservation-change/daily")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-change-daily",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Reservation")
                                .summary("예약 변경이력 — 추이 달력 (일별)")
                                .description("일별 · 구분별 {day, branch, total, changed}. "
                                        + "byRegistered=등록일 기준(그 날 등록된 검사예약 total 과 그중 변경 changed), "
                                        + "byReserveDate=예약일 기준(그 날로 잡혀 있는 total 과 그중 변경 changed, 미래 달 포함). "
                                        + "변경률 = changed/total 은 프론트가 계산. 달력 6주 그리드 커버 → 최대 366일. "
                                        + "MEDICAL·ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("범위 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("범위 종료 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data.byRegistered")
                                                .description("등록일 기준 일별 카운트 (day/branch/total/changed)"),
                                        subsectionWithPath("data.byReserveDate")
                                                .description("예약일 기준 일별 카운트 (day/branch/total/changed · 미래 달 포함)"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationChangeDailyResponse"))
                                .build())));
    }
}
