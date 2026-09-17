package com.bviit.analytics.accounting.docs;

import com.bviit.analytics.accounting.dto.AccountingStatus;
import com.bviit.analytics.accounting.dto.MedicalMonthlyPoint;
import com.bviit.analytics.accounting.dto.MedicalReceiptRow;
import com.bviit.analytics.accounting.dto.VisionMonthlyPoint;
import com.bviit.analytics.accounting.dto.VisionReceiptRow;
import com.bviit.analytics.accounting.service.AccountingReader;
import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
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
 * /api/accounting/** 5개 엔드포인트 문서화. AccountingReader 를 목킹해 카나리 DTO 응답을 만든다.
 * 실계정·실데이터 노출 없음. 시범 스코프: docs/api-docs-strategy.md §4·§5.
 *
 * 파라미터/헤더/필드는 ResourceSnippetParameters.builder 로 전달해야 OpenAPI 스키마에 반영된다.
 * 표준 restdocs 의 responseFields()/relaxedResponseFields()/queryParameters() 는
 * .adoc 스니펫만 만들고 resource.json 에는 포함되지 않아 스키마가 비게 된다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-accounting-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:accounting-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class AccountingDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean AccountingReader accountingReader;

    /** 문서화는 ADMIN 계정으로만 접근한다(SecurityConfig 매처와 일치). */
    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubReader() {
        when(accountingReader.getStatus()).thenReturn(new AccountingStatus(
                "2026-07-01", "2026-07-31", "2026-07-16T03:15:00", 2023,
                "2026-07-01", "2026-07-31", "2026-07-16T03:15:00"));

        when(accountingReader.getMedicalReceipts(anyString(), anyString())).thenReturn(List.of(
                new MedicalReceiptRow(
                        "2026-07-15-외래-CHART001-1-1", "2026-07-15", "외래", "CHART001",
                        1, "홍길동", "건강보험", "김의사", "박수납",
                        "10:30", "1진료실", "기타외래", "정상", false,
                        0, 0, 30000, 21000, 9000, 5000, 14000,
                        0, 0, 0, 0, 14000, 0, 1000, "이벤트할인",
                        10000, 4000, 0, 0, 0, 0, 0, 0, 0, 0, 14000)));

        when(accountingReader.getMedicalMonthly(anyList(), anyString())).thenReturn(List.of(
                new MedicalMonthlyPoint(2026, 6, 1234, 55_000_000L, 30_000_000L, 60_000_000L, 25_000_000L),
                new MedicalMonthlyPoint(2026, 7, 1350, 62_000_000L, 33_000_000L, 66_000_000L, 29_000_000L)));

        when(accountingReader.getVisionReceipts(anyString(), anyString())).thenReturn(List.of(
                new VisionReceiptRow(
                        "CUST001-1-1-P", "2026-07-15", "CUST001", "홍길동", "VIP",
                        "2026-07-15", "김수술", "라식", "라식", "이상담",
                        "결제처리", "카드", "삼성카드", "삼성", "단말기",
                        "수술", "SMILE PRO", "박등록", "2026-07-15 14:22:10", "",
                        3_000_000L, 200_000L, 2_800_000L,
                        Map.of("수술", 3_000_000L))));

        when(accountingReader.getVisionMonthly(anyList())).thenReturn(List.of(
                new VisionMonthlyPoint(2026, 6, 87, 240_000_000L),
                new VisionMonthlyPoint(2026, 7, 92, 265_000_000L)));
    }

    @Test
    void status_문서화() throws Exception {
        mockMvc.perform(get("/api/accounting/status").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accounting-status",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Accounting")
                                .summary("회계 마트 적재 현황")
                                .description("화면 상단 '데이터 기준' 표기용. 임원(ADMIN·DIRECTOR) 이상 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN·DIRECTOR 필수"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.medicalFrom").description("진료 수납 마트 시작일 (YYYY-MM-DD, 미적재 시 null)"),
                                        fieldWithPath("data.medicalTo").description("진료 수납 마트 끝일"),
                                        fieldWithPath("data.medicalLoadedAt").description("진료 수납 마트 마지막 적재 시각"),
                                        fieldWithPath("data.medicalMonthlyFromYear").description("진료 매출 월별 마트 시작 연도 (레거시 2023~)"),
                                        fieldWithPath("data.visionFrom").description("시력교정 마트 시작일"),
                                        fieldWithPath("data.visionTo").description("시력교정 마트 끝일"),
                                        fieldWithPath("data.visionLoadedAt").description("시력교정 마트 마지막 적재 시각"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("AccountingStatus"))
                                .build())));
    }

    @Test
    void medical_receipts_문서화() throws Exception {
        mockMvc.perform(get("/api/accounting/medical-receipts")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accounting-medical-receipts",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Accounting")
                                .summary("진료 수납 내역 조회 (의사랑)")
                                .description("의사랑 IPLUS 외래·입원 원장 행. 2026-01-01 이후만 행이 실린다. 임원(ADMIN·DIRECTOR) 이상 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN·DIRECTOR 필수"))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작일 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("조회 종료일 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].id").description("행 고유 키 (수납일-구분-차트번호-일련번호-순번)"),
                                        fieldWithPath("data[].receiptDate").description("수납일 (YYYY-MM-DD)"),
                                        fieldWithPath("data[].receiptType").description("수납구분 — 외래 · 입원"),
                                        fieldWithPath("data[].chartNo").description("차트번호"),
                                        fieldWithPath("data[].serialNo").description("일련번호 (99=미수입금 · 98=환불금 · 입원=0)"),
                                        fieldWithPath("data[].patientName").description("환자명"),
                                        fieldWithPath("data[].insuranceType").description("보험유형 (일련번호 98·99 는 '환불금'·'미수입금')"),
                                        fieldWithPath("data[].doctor").description("진료의사"),
                                        fieldWithPath("data[].receiptStaff").description("수납직원"),
                                        fieldWithPath("data[].receiptTime").description("수납시각 (HH:MM)"),
                                        fieldWithPath("data[].room").description("진료실"),
                                        fieldWithPath("data[].revenueType").description("매출구분 — 입원 · 입원외 · 기타외래"),
                                        fieldWithPath("data[].status").description("상태 — 정상 · 취소"),
                                        fieldWithPath("data[].closed").description("마감 여부"),
                                        fieldWithPath("data[].hundredCopay").description("100분위 본인부담"),
                                        fieldWithPath("data[].hundredUnpaid").description("100분위 미수"),
                                        fieldWithPath("data[].salaryTotal").description("급여총액"),
                                        fieldWithPath("data[].claimAmount").description("공단청구액"),
                                        fieldWithPath("data[].copay").description("본인부담금"),
                                        fieldWithPath("data[].nonCovered").description("비급여액"),
                                        fieldWithPath("data[].totalCopay").description("수납할금액(총본인부담)"),
                                        fieldWithPath("data[].welfareSupport").description("의료급여 지원"),
                                        fieldWithPath("data[].disabledSupport").description("장애인 지원"),
                                        fieldWithPath("data[].supportAmount").description("기타 지원금"),
                                        fieldWithPath("data[].healthLivingExpense").description("건강생활비"),
                                        fieldWithPath("data[].actualPaid").description("실수납액"),
                                        fieldWithPath("data[].outstanding").description("미수 잔액"),
                                        fieldWithPath("data[].discount").description("할인액"),
                                        fieldWithPath("data[].discountReason").description("할인 사유"),
                                        fieldWithPath("data[].card").description("카드 결제액"),
                                        fieldWithPath("data[].cash").description("현금 결제액"),
                                        fieldWithPath("data[].transfer").description("계좌이체 결제액"),
                                        fieldWithPath("data[].refund").description("환불액 (PAYTRANS 81·82 합)"),
                                        fieldWithPath("data[].outstandingOccurred").description("미수 발생액"),
                                        fieldWithPath("data[].outstandingRecovered").description("미수 회수액 (PAYTRANS 91·92·93 합)"),
                                        fieldWithPath("data[].outstandingCard").description("미수회수 — 카드"),
                                        fieldWithPath("data[].outstandingCash").description("미수회수 — 현금"),
                                        fieldWithPath("data[].outstandingTransfer").description("미수회수 — 계좌이체"),
                                        fieldWithPath("data[].refundOccurred").description("환불 발생액"),
                                        fieldWithPath("data[].cashReceipt").description("현금영수증 발행액"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("MedicalReceiptListResponse"))
                                .build())));
    }

    @Test
    void medical_receipts_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/accounting/medical-receipts/monthly")
                        .param("years", "2025,2026").param("category", "백내장")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accounting-medical-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Accounting")
                                .summary("진료 매출 월별 조회")
                                .description("행 마트가 있는 월(2026-01~)은 행 재집계, 그 전은 집계 마트. category != '전체' 이면 행 마트만 사용. 임원(ADMIN·DIRECTOR) 이상 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN·DIRECTOR 필수"))
                                .queryParameters(
                                        parameterWithName("years").description("조회 연도 목록 (콤마 구분 · 1~5개)"),
                                        parameterWithName("category").description("구분 필터 — 전체 · 외래 · 입원 · 백내장 (기본: 전체)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].count").description("수납 건수"),
                                        fieldWithPath("data[].net").description("실수납합계 (원)"),
                                        fieldWithPath("data[].claim").description("공단 청구액"),
                                        fieldWithPath("data[].salaryTotal").description("급여총액"),
                                        fieldWithPath("data[].nonCovered").description("비급여액"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("MedicalMonthlyListResponse"))
                                .build())));
    }

    @Test
    void vision_receipts_문서화() throws Exception {
        mockMvc.perform(get("/api/accounting/vision-receipts")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accounting-vision-receipts",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Accounting")
                                .summary("시력교정 매출 내역 조회 (SOFTCRM)")
                                .description("비급여 수납 전표 상세 1줄(결제수단별) = 1행. 매출 집계·그래프 화면도 이 응답을 접어 쓴다. 임원(ADMIN·DIRECTOR) 이상 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN·DIRECTOR 필수"))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작일 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("조회 종료일 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].id").description("행 고유 키 (고객번호-Seq-SubSeq-처리/취소)"),
                                        fieldWithPath("data[].receiptDate").description("수납일"),
                                        fieldWithPath("data[].chartNo").description("고객번호 (CstNum)"),
                                        fieldWithPath("data[].patientName").description("고객명"),
                                        fieldWithPath("data[].customerGrade").description("고객 등급"),
                                        fieldWithPath("data[].surgeryDate").description("수술일 (YYYY-MM-DD)"),
                                        fieldWithPath("data[].surgeon").description("수술의"),
                                        fieldWithPath("data[].procedureRight").description("우안 시술"),
                                        fieldWithPath("data[].procedureLeft").description("좌안 시술"),
                                        fieldWithPath("data[].counselor").description("상담사"),
                                        fieldWithPath("data[].status").description("결제처리 · 결제취소 (취소행은 amount 음수)"),
                                        fieldWithPath("data[].paymentMethod").description("결제수단 (카드/현금/이체 등)"),
                                        fieldWithPath("data[].cardCompany").description("카드사"),
                                        fieldWithPath("data[].acquirer").description("매입사"),
                                        fieldWithPath("data[].paymentMode").description("결제 방식 (단말기/수기 등)"),
                                        fieldWithPath("data[].category").description("진료구분 (항목 1종이면 그 이름, 여럿이면 '다중')"),
                                        fieldWithPath("data[].productName").description("상품명"),
                                        fieldWithPath("data[].registeredBy").description("등록자"),
                                        fieldWithPath("data[].registeredAt").description("등록 시각"),
                                        fieldWithPath("data[].paymentMemo").description("결제 메모"),
                                        fieldWithPath("data[].amount").description("수납금액 (원, 취소행 음수)"),
                                        fieldWithPath("data[].taxable").description("과세 (건기식·영양제 7종 합)"),
                                        fieldWithPath("data[].exempt").description("면세 (amount − taxable)"),
                                        subsectionWithPath("data[].itemAmounts").description("항목별 금액 맵 (VisionItemCatalog.ITEMS 17종 키)"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("VisionReceiptListResponse"))
                                .build())));
    }

    @Test
    void vision_receipts_monthly_문서화() throws Exception {
        mockMvc.perform(get("/api/accounting/vision-receipts/monthly")
                        .param("years", "2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("accounting-vision-monthly",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Accounting")
                                .summary("시력교정 매출 월별 조회")
                                .description("list_vision_receipt 를 (yr, mo) 로 GROUP BY 한 값. 2023~ 전 기간. 임원(ADMIN·DIRECTOR) 이상 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN·DIRECTOR 필수"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분 · 1~5개)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].count").description("행 수 (취소행 포함)"),
                                        fieldWithPath("data[].amount").description("월 합계 금액 (원, 취소 상계 순액)"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("VisionMonthlyListResponse"))
                                .build())));
    }
}
