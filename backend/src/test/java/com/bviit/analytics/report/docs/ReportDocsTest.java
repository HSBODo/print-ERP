package com.bviit.analytics.report.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.service.WeeklyReportReader;
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
 * /api/report/weekly 문서화 — 주차 레포트 원시 집계.
 * WeeklyReportReader 를 목킹해 카나리 WeeklyReportItem 응답을 만든다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-report-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:report-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ReportDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean WeeklyReportReader weeklyReportReader;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubReader() {
        when(weeklyReportReader.getWeeklyStats(anyList())).thenReturn(List.of(
                WeeklyReportItem.builder()
                        .year(2026).week(30)
                        .startDate("2026-07-20").endDate("2026-07-26")
                        .reservations(320).call(180).online(140)
                        .introGeneral(220).introCustomer(35).introStaff(8)
                        .jobOffice(120).jobStudent(40).jobEtc(60)
                        .examTotal(240).visionExam(190).cataractExam(50).oneDay(35)
                        .visionBooked(120).cataractBooked(28).oneDayBooked(22)
                        .stopCount(12).examGeneralBase(155).bookedGeneral(98)
                        .visionSurgery(88).cataractSurgery(42).totalSurgery(130)
                        .reoperation(6).reopLaser(4).reopLens(2)
                        .outpatient(410)
                        .dreamlensNew(3).dreamlensFu(11)
                        .build()));
    }

    @Test
    void weekly_report_문서화() throws Exception {
        mockMvc.perform(get("/api/report/weekly")
                        .param("years", "2024,2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("report-weekly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Report")
                                .summary("주차 레포트 원시 집계")
                                .description("월간 레포트와 같은 도표를 ISO 8601 연간 주차(월~일 · 첫 목요일 든 주=1주차) 축으로 조회. "
                                        + "파생 지표(예약률·중단율·비율)는 프론트에서 이 원시값으로 계산한다. "
                                        + "값 null 은 '그 주엔 알 수 없음'을 뜻하며 0 과 구분해야 한다(예: 홈페이지 소스 미연결 구간의 online). "
                                        + "MEDICAL·ALL 부서 gate.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL·ALL 부서"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분 · 1~5개, ISO 주차연도 기준)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("ISO 주차연도 (1주차가 전년 12월을 물어도 이 연도로 귀속)"),
                                        fieldWithPath("data[].week").description("ISO 연간 주차 (1~53)"),
                                        fieldWithPath("data[].startDate").description("주 시작일 월요일 (YYYY-MM-DD)"),
                                        fieldWithPath("data[].endDate").description("주 종료일 일요일 (YYYY-MM-DD)"),
                                        fieldWithPath("data[].reservations").description("예약 종합 = 콜 + 온라인"),
                                        fieldWithPath("data[].call").description("콜 예약 (CTI · CRM)"),
                                        fieldWithPath("data[].online").description("온라인 예약 (2026-06 컷오버 전후 정의 상이)"),
                                        fieldWithPath("data[].introGeneral").description("일반 고객 검사 유입 (소개 제외)"),
                                        fieldWithPath("data[].introCustomer").description("고객 소개 검사 유입"),
                                        fieldWithPath("data[].introStaff").description("직원 소개 검사 유입"),
                                        fieldWithPath("data[].jobOffice").description("직장인 검사"),
                                        fieldWithPath("data[].jobStudent").description("학생 검사"),
                                        fieldWithPath("data[].jobEtc").description("기타 검사"),
                                        fieldWithPath("data[].examTotal").description("총검사수 = EXAM 행 + Cataract_Exam 세션"),
                                        fieldWithPath("data[].visionExam").description("시력교정 검사자"),
                                        fieldWithPath("data[].cataractExam").description("백내장 검사수 (RESERVATION H, 사람 단위)"),
                                        fieldWithPath("data[].oneDay").description("원데이 검사 (검사OP M/5)"),
                                        fieldWithPath("data[].visionBooked").description("시력교정 예약률 분자 (분모=visionExam)"),
                                        fieldWithPath("data[].cataractBooked").description("백내장 예약률 분자 (분모=cataractExam, 사람 단위)"),
                                        fieldWithPath("data[].oneDayBooked").description("원데이 예약률 분자 (분모=oneDay)"),
                                        fieldWithPath("data[].stopCount").description("중단율 분자 (분모=visionExam)"),
                                        fieldWithPath("data[].examGeneralBase").description("시력교정 일반예약률 분모 (원데이 아닌 검사)"),
                                        fieldWithPath("data[].bookedGeneral").description("시력교정 일반예약률 분자"),
                                        fieldWithPath("data[].visionSurgery").description("시력교정 수술 (수술일 기준)"),
                                        fieldWithPath("data[].cataractSurgery").description("백내장 수술"),
                                        fieldWithPath("data[].totalSurgery").description("수술 합계"),
                                        fieldWithPath("data[].reoperation").description("재수술 (건 단위, 레이저+렌즈)"),
                                        fieldWithPath("data[].reopLaser").description("재수술 — 레이저"),
                                        fieldWithPath("data[].reopLens").description("재수술 — 렌즈"),
                                        fieldWithPath("data[].outpatient").description("외래"),
                                        fieldWithPath("data[].dreamlensNew").description("드림렌즈 신규 (외래센터 확정값 · 마트 시드 V30, MSSQL 직결에선 null)"),
                                        fieldWithPath("data[].dreamlensFu").description("드림렌즈 FU"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("WeeklyReportListResponse"))
                                .build())));
    }
}
