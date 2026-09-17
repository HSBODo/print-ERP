package com.bviit.analytics.overall.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.service.OverallExamMonthlyReader;
import com.bviit.analytics.overall.service.OverallExamWeeklyReader;
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

import java.util.List;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.anyList;
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
 * overall 도메인 2개 엔드포인트 문서화 — 월별·주간 검사자 종합지표.
 *
 * 관리자 전용 페이지지만 API 게이트는 MEDICAL/ALL.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-overall-exam-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:overall-exam-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class OverallExamDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean OverallExamMonthlyReader overallExamMonthlyReader;
    @MockitoBean OverallExamWeeklyReader overallExamWeeklyReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        OverallExamMonthlyItem monthly = OverallExamMonthlyItem.builder()
                .year(2026).month(7).partial(false)
                .totalExam(419)
                .introGeneral(310).introCustomer(80).introStaff(29)
                .jobOffice(220).jobStudent(70).jobEtc(129)
                .visionBooked(150).cataractTotal(85).cataractOnly(72).cataractBooked(38)
                .stopCount(30).visionExam(320).dreamlens(14).oneDay(35).oneDayBooked(28)
                .build();
        when(overallExamMonthlyReader.getMonthlyStats(anyList())).thenReturn(List.of(monthly));

        OverallExamWeeklyItem weekly = OverallExamWeeklyItem.builder()
                .year(2026).month(7).week(4).partial(false)
                .startDate("2026-07-20").endDate("2026-07-26")
                .totalExam(105)
                .introGeneral(78).introCustomer(20).introStaff(7)
                .jobOffice(55).jobStudent(18).jobEtc(32)
                .visionBooked(38).cataractTotal(22).cataractOnly(18).cataractBooked(10)
                .stopCount(7).visionExam(80).dreamlens(3).oneDay(9).oneDayBooked(7)
                .build();
        when(overallExamWeeklyReader.getWeeklyStats(anyList())).thenReturn(List.of(weekly));
    }

    @Test
    void overall_exam_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/overall-exam/monthly")
                        .param("years", "2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overall-exam-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Overall")
                                .summary("월별 검사자 종합지표 (관리자 전용 페이지)")
                                .description("주별(월~일, 월 경계 클립)의 월 롤업 — 월 합계 = 그 달 주 합계로 정확히 일치. "
                                        + "24·25 는 V14+V16 시드가 SSOT. 배치는 batch.mart.min-year(=2026) 가드로 26년부터만 upsert. "
                                        + "파생 칼럼(예약률·비율)은 프론트가 원시값으로 계산. MEDICAL/ALL. 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(overallMonthlyFields())
                                .responseSchema(Schema.schema("OverallExamMonthlyListResponse"))
                                .build())));
    }

    @Test
    void overall_exam_weekly_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/overall-exam/weekly")
                        .param("years", "2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("overall-exam-weekly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Overall")
                                .summary("주간 검사자 종합지표 (관리자 전용 페이지)")
                                .description("주 정의: 월~일. 월 경계를 걸치는 주는 각 달에 귀속(월 합계 = 그 달 주 합계). "
                                        + "1일~첫 월요일 직전 선행 부분 구간은 첫 정규 주에 합쳐 1주 = 1일~첫 일요일. 마지막 주만 부분 주 가능. "
                                        + "24·25 레거시 확정값은 월 단위라 주별에는 사용하지 않음(모두 라이브 집계). MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(overallWeeklyFields())
                                .responseSchema(Schema.schema("OverallExamWeeklyListResponse"))
                                .build())));
    }

    // ─── 공용 필드 ───────────────────────────────────────

    private static org.springframework.restdocs.payload.FieldDescriptor[] overallMonthlyFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].year").description("연도"),
                fieldWithPath("data[].month").description("월"),
                fieldWithPath("data[].partial").description("현재 진행 중인 월(부분 집계) 여부"),
                fieldWithPath("data[].totalExam").description("총검사자 (EXAM 행 + Cataract_Exam 세션)"),
                fieldWithPath("data[].introGeneral").description("소개유형 일반 (잔차)"),
                fieldWithPath("data[].introCustomer").description("소개유형 고객소개"),
                fieldWithPath("data[].introStaff").description("소개유형 직원소개"),
                fieldWithPath("data[].jobOffice").description("직업 직장인"),
                fieldWithPath("data[].jobStudent").description("직업 학생"),
                fieldWithPath("data[].jobEtc").description("직업 기타"),
                fieldWithPath("data[].visionBooked").description("시력교정 수술예약"),
                fieldWithPath("data[].cataractTotal").description("백내장 전체 (노안 포함) = Cataract_Exam 세션수"),
                fieldWithPath("data[].cataractOnly").description("백내장 만 (추천 눈 수)"),
                fieldWithPath("data[].cataractBooked").description("백내장 예약 (백내장 검사자 중 O 존재)"),
                fieldWithPath("data[].stopCount").description("중단수 (EXAM.STOP_YN='Y')"),
                fieldWithPath("data[].visionExam").description("검사건수 시력교정"),
                fieldWithPath("data[].dreamlens").description("검사건수 드림렌즈"),
                fieldWithPath("data[].oneDay").description("원데이 (검사OP M/5)"),
                fieldWithPath("data[].oneDayBooked").description("원데이 예약 (원데이 후 7일 이내 유효 시력교정 수술)"),
                subsectionWithPath("meta").description("응답 메타 (source=LIVE)")
        };
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] overallWeeklyFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath("data[].year").description("연도"),
                fieldWithPath("data[].month").description("월"),
                fieldWithPath("data[].week").description("그 달 안의 주차 (1부터)"),
                fieldWithPath("data[].partial").description("월 경계로 잘린 부분 주 여부"),
                fieldWithPath("data[].startDate").description("주 시작일 (월 경계 클립) YYYY-MM-DD"),
                fieldWithPath("data[].endDate").description("주 종료일 (월 경계 클립) YYYY-MM-DD"),
                fieldWithPath("data[].totalExam").description("총검사자"),
                fieldWithPath("data[].introGeneral").description("소개유형 일반"),
                fieldWithPath("data[].introCustomer").description("소개유형 고객소개"),
                fieldWithPath("data[].introStaff").description("소개유형 직원소개"),
                fieldWithPath("data[].jobOffice").description("직업 직장인"),
                fieldWithPath("data[].jobStudent").description("직업 학생"),
                fieldWithPath("data[].jobEtc").description("직업 기타"),
                fieldWithPath("data[].visionBooked").description("시력교정 수술예약"),
                fieldWithPath("data[].cataractTotal").description("백내장 전체"),
                fieldWithPath("data[].cataractOnly").description("백내장 만"),
                fieldWithPath("data[].cataractBooked").description("백내장 예약"),
                fieldWithPath("data[].stopCount").description("중단수"),
                fieldWithPath("data[].visionExam").description("시력교정 검사건수"),
                fieldWithPath("data[].dreamlens").description("드림렌즈 검사건수"),
                fieldWithPath("data[].oneDay").description("원데이"),
                fieldWithPath("data[].oneDayBooked").description("원데이 예약"),
                subsectionWithPath("meta").description("응답 메타 (source=LIVE)")
        };
    }
}
