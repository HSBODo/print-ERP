package com.bviit.analytics.reservation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.reservation.dto.ReservationListHomepageResult;
import com.bviit.analytics.reservation.dto.ReservationListResult;
import com.bviit.analytics.reservation.service.ReservationListHomepageReader;
import com.bviit.analytics.reservation.service.ReservationListReader;
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
 * 예약자 리스트 계열 2개 엔드포인트 문서화.
 *
 *   - /api/reservation-list                — RESERVATION 기반 검사예약 명단 (예약 종합 콜+온라인과 정합)
 *   - /api/reservation-list-homepage       — 레거시 counsel/online_list.php 목록 (홈페이지 소스)
 *
 * 두 응답 모두 rows 는 camelCase Map 이라 subsectionWithPath 로만 표기 — 세부 키는 프론트 zod 스키마 참조.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reservation-list-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:reservation-list-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ReservationListDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ReservationListReader reservationListReader;
    @MockitoBean ReservationListHomepageReader reservationListHomepageReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubReaders() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("reserveNum", "R202607200001");
        row.put("registeredDate", "2026-07-20");
        row.put("reserveDate", "2026-07-22");
        row.put("chartNo", "C0000123");
        row.put("name", "홍길동");
        row.put("branch", "강남");
        row.put("channel", "네이버");
        row.put("reserveState", "Y");
        when(reservationListReader.getReservationList(anyString(), anyString()))
                .thenReturn(new ReservationListResult(List.of(row)));

        Map<String, Object> hpRow = new LinkedHashMap<>();
        hpRow.put("regDate", "2026-06-15 09:20:00");
        hpRow.put("name", "김민수");
        hpRow.put("phone", "010-****-1234");
        hpRow.put("reserveDate", "2026-06-20");
        hpRow.put("branch", "강남");
        hpRow.put("memo", "라식 상담");
        when(reservationListHomepageReader.getReservationListHomepage(anyString(), anyString()))
                .thenReturn(new ReservationListHomepageResult(
                        List.of(hpRow),
                        "2026-06-15 09:20:00",
                        false));
    }

    @Test
    void reservation_list_문서화() throws Exception {
        mockMvc.perform(get("/api/reservation-list")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Reservation")
                                .summary("예약자 리스트 (RESERVATION 기반)")
                                .description("검사예약 명단. rows 합계 = 예약 종합 월 값 (콜+온라인, 카카오 미포함). "
                                        + "postgres-mart 프로파일에서 마트 조회. 최대 366일. 미연결 시 503. "
                                        + "MEDICAL·ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("등록일 시작 (YYYY-MM-DD, 포함)"),
                                        parameterWithName("to").description("등록일 종료 (YYYY-MM-DD, 포함 · 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data.rows")
                                                .description("예약자 행 — camelCase 키의 동적 Map. "
                                                        + "핵심 키: reserveNum, registeredDate, reserveDate, chartNo, name, "
                                                        + "branch, channel, reserveState (Y/I/H/C). "
                                                        + "전체 계약은 프론트 api/reservation/reservationList.ts zod 스키마."),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationListResponse"))
                                .build())));
    }

    @Test
    void reservation_list_homepage_문서화() throws Exception {
        mockMvc.perform(get("/api/reservation-list-homepage")
                        .param("from", "2026-06-01").param("to", "2026-06-30")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-list-homepage",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Reservation")
                                .summary("예약자 리스트_홈페이지 (레거시)")
                                .description("counsel/online_list.php(SCR-39) 목록. 조회 전용 — 레거시 화면의 쓰기 액션(삭제·"
                                        + "공개여부 토글·완료처리)은 옮기지 않는다. HOMEPAGE_DATASOURCE_URL 미설정 시 503. "
                                        + "live=false 스냅샷이면 lastRegDate 를 화면이 '천장'으로 해석해 이후 구간 경고를 띄움. "
                                        + "MEDICAL·ALL 부서.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("등록일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("등록일 종료 (YYYY-MM-DD, 그 날 23시대까지 · 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data.rows")
                                                .description("홈페이지 예약자 행 — camelCase 키. 프론트 api/reservation/reservationListHomepage.ts 참조."),
                                        fieldWithPath("data.lastRegDate")
                                                .description("소스가 담고 있는 마지막 등록일시 (스냅샷이면 '천장', 라이브면 최근 등록건 시각)"),
                                        fieldWithPath("data.live").description("실시간 소스(운영 DB 직결) 여부. false 면 스냅샷 파일."),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationListHomepageResponse"))
                                .build())));
    }
}
