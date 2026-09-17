package com.bviit.analytics.outpatient.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsReader;
import com.bviit.analytics.outpatient.service.OutpatientListReader;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
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
 * outpatient 도메인 2개 엔드포인트 문서화.
 *
 * outpatient-count/monthly 는 홈 대시보드 개방(부서 무관), outpatient-list 는 MEDICAL/ALL.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-outpatient-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:outpatient-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class OutpatientDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean OutpatientCountStatsReader outpatientCountStatsReader;
    @MockitoBean OutpatientListReader outpatientListReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        OutpatientCountMonthlyItem item = OutpatientCountMonthlyItem.builder()
                .year(2026).month(7).outpatientCount(1520).total(1520).build();
        when(outpatientCountStatsReader.getMonthlyStats(anyList())).thenReturn(List.of(item));

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("reserveNum", "R202608010001");
        row.put("reserveDate", "2026-08-01");
        row.put("visitDate", "2026-08-01");
        row.put("chartNo", "C0000200");
        row.put("name", "김민수");
        row.put("branch", "강남");
        row.put("reserveState", "I");
        when(outpatientListReader.getOutpatientList(anyString(), anyString())).thenReturn(List.of(row));
    }

    @Test
    void outpatient_count_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/outpatient-count/monthly")
                        .param("years", "2024,2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("outpatient-count-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Outpatient")
                                .summary("외래수 — 월별")
                                .description("2024~2025 레거시 확정값, 2026 은 확인된 월만 값(미확인은 null). "
                                        + "운영 DB 산출 기준 확정 전까지 레거시 입력값이 공식 표시값. "
                                        + "SecurityConfig 홈 예외 매처 — MEDICAL·MARKETING·OVERSEAS_MARKETING·ALL 부서 무관 열람.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — 부서 무관 (홈 대시보드 개방)"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].outpatientCount").description("외래수 (null 가능 — 미확인 월)").optional().type(JsonFieldType.NUMBER),
                                        fieldWithPath("data[].total").description("총합 (= outpatientCount)").optional().type(JsonFieldType.NUMBER))
                                .responseSchema(Schema.schema("OutpatientCountMonthlyListResponse"))
                                .build())));
    }

    @Test
    void outpatient_list_문서화() throws Exception {
        mockMvc.perform(get("/api/outpatient-list")
                        .param("from", "2026-08-01").param("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("outpatient-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Outpatient")
                                .summary("외래수 리스트 (외래 예약 F + 내원/퇴원 I/H)")
                                .description("외래수(집계) 와 정합. postgres-mart 프로파일에서 마트 조회. "
                                        + "최대 366일. MEDICAL/ALL. 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("시작일 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("종료일 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        subsectionWithPath("data").description("외래 행 배열 — camelCase 키. reserveNum, reserveDate, visitDate, chartNo, name, branch, reserveState(F|I|H) 등"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("OutpatientListResponse"))
                                .build())));
    }
}
