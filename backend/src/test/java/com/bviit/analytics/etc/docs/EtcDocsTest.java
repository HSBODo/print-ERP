package com.bviit.analytics.etc.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.dto.DreamlensLedgerRequest;
import com.bviit.analytics.etc.dto.DreamlensLedgerRow;
import com.bviit.analytics.etc.service.B2bRevenueStatsReader;
import com.bviit.analytics.etc.service.DreamlensLedgerService;
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
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
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
 * etc 도메인 5개 엔드포인트 문서화 — B2B 매출 + 드림렌즈 장부 CRUD 4.
 *
 * 드림렌즈 장부는 <b>직접 입력 테이블</b> — 배치 마트가 아니라 JPA 엔티티 CRUD.
 * 초기 10행은 DreamlensLedgerSeeder 가 표가 비었을 때만 넣는다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-etc-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:etc-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class EtcDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean B2bRevenueStatsReader b2bRevenueStatsReader;
    @MockitoBean DreamlensLedgerService dreamlensLedgerService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubServices() {
        B2bRevenueMonthlyItem b2b = B2bRevenueMonthlyItem.builder()
                .year(2026).month(7)
                .totalRevenue(120_000_000).caseCount(45).avgRevenuePerCase(2_666_666)
                .visionRevenue(90_000_000).cataractRevenue(30_000_000)
                .visionCount(35).cataractCount(10)
                .designatedRevenue(70_000_000).nonDesignatedRevenue(50_000_000)
                .designatedCount(20).nonDesignatedCount(25)
                .opCost(80_000_000).examCost(15_000_000).dnaCost(3_000_000)
                .prpCost(2_000_000).etcCost(5_000_000).presbyopiaCost(10_000_000).hospitalSupplyCost(5_000_000)
                .build();
        when(b2bRevenueStatsReader.getMonthlyRevenue(anyList())).thenReturn(List.of(b2b));

        DreamlensLedgerRow row = DreamlensLedgerRow.builder()
                .id(101L)
                .entryDate(LocalDate.of(2026, 8, 14))
                .visitType("신규").customerNo("C0000200").customerName("김민수")
                .examiner("이검사").purchaseType("드림렌즈")
                .rLensName("BE-DL").rBox("15").rLensSpec("BC 8.4").rColor("clear")
                .rReturnDate(null)
                .lLensName("BE-DL").lBox("15").lLensSpec("BC 8.4").lColor("clear")
                .lReturnDate(null)
                .dlNewRevenue(1_200_000).dlRepurchaseRevenue(0)
                .mNewRevenue(0).mRepurchaseRevenue(0)
                .hlNewRevenue(0).hlRepurchaseRevenue(0)
                .depositRevenue(0).fittingRevenue(50_000)
                .supplyRevenue(0).treatmentRevenue(0)
                .lensListPrice(1_500_000).totalRevenue(1_250_000)
                .source("MANUAL")
                .nextReservation("2026-08-28")
                .recall1("").recall1Reservation("").recall1Absent("")
                .recall2("").recall2Reservation("").recall2Absent("")
                .recall3("").recall3Reservation("").recall3Absent("")
                .build();
        when(dreamlensLedgerService.findRows(any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(row));
        when(dreamlensLedgerService.create(any(DreamlensLedgerRequest.class))).thenReturn(row);
        when(dreamlensLedgerService.update(anyLong(), any(DreamlensLedgerRequest.class))).thenReturn(row);
        doNothing().when(dreamlensLedgerService).delete(anyLong());
    }

    // ─── B2B ────────────────────────────────────────────

    @Test
    void b2b_revenue_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/b2b-revenue")
                        .param("years", "2025,2026")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("b2b-revenue",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Etc")
                                .summary("B2B 매출 월별 집계")
                                .description("레거시 BCRM b2b-corp-settlement 기준으로 7개 수가 항목 합산. "
                                        + "postgres-mart 프로파일에서 마트 조회. MEDICAL/ALL. 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(parameterWithName("years").description("조회 연도 목록 (콤마 구분)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].year").description("연도"),
                                        fieldWithPath("data[].month").description("월"),
                                        fieldWithPath("data[].totalRevenue").description("총 매출 (원)"),
                                        fieldWithPath("data[].caseCount").description("건수"),
                                        fieldWithPath("data[].avgRevenuePerCase").description("건당 평균 매출"),
                                        fieldWithPath("data[].visionRevenue").description("시력교정 매출"),
                                        fieldWithPath("data[].cataractRevenue").description("백내장 매출"),
                                        fieldWithPath("data[].visionCount").description("시력교정 건수"),
                                        fieldWithPath("data[].cataractCount").description("백내장 건수"),
                                        fieldWithPath("data[].designatedRevenue").description("지정의 매출"),
                                        fieldWithPath("data[].nonDesignatedRevenue").description("비지정의 매출"),
                                        fieldWithPath("data[].designatedCount").description("지정의 건수"),
                                        fieldWithPath("data[].nonDesignatedCount").description("비지정의 건수"),
                                        fieldWithPath("data[].opCost").description("수술 원가"),
                                        fieldWithPath("data[].examCost").description("검사 원가"),
                                        fieldWithPath("data[].dnaCost").description("DNA 원가"),
                                        fieldWithPath("data[].prpCost").description("PRP 원가"),
                                        fieldWithPath("data[].etcCost").description("기타 원가"),
                                        fieldWithPath("data[].presbyopiaCost").description("노안 원가"),
                                        fieldWithPath("data[].hospitalSupplyCost").description("병원 소모품 원가"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("B2bRevenueMonthlyListResponse"))
                                .build())));
    }

    // ─── Dreamlens ─────────────────────────────────────

    @Test
    void dreamlens_ledger_list_문서화() throws Exception {
        mockMvc.perform(get("/api/dreamlens-ledger")
                        .param("from", "2026-07-01").param("to", "2026-08-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("dreamlens-ledger-list",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Etc")
                                .summary("드림렌즈 장부 조회 (직접 입력 테이블)")
                                .description("배치 마트가 아니라 dreamlens_ledger JPA 엔티티 CRUD. "
                                        + "MEDICAL/ALL. source: AUTO(배치 초안) / MANUAL(사람 입력·수정) — 구버전 행 null 은 MANUAL 로 취급.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .queryParameters(
                                        parameterWithName("from").description("entryDate 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("entryDate 종료 (YYYY-MM-DD)"))
                                .responseFields(dreamlensRowListFields())
                                .responseSchema(Schema.schema("DreamlensLedgerListResponse"))
                                .build())));
    }

    @Test
    void dreamlens_ledger_create_문서화() throws Exception {
        DreamlensLedgerRequest req = sampleRequest();
        mockMvc.perform(post("/api/dreamlens-ledger")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("dreamlens-ledger-create",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Etc")
                                .summary("드림렌즈 장부 행 추가")
                                .description("모든 매출 필드는 0 이상. entryDate 필수. mNewRevenue 는 Bean 규칙(MN 대문자) 우회 위해 필드 직렬화 강제.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .requestFields(dreamlensRequestFields())
                                .responseFields(dreamlensRowFields())
                                .requestSchema(Schema.schema("DreamlensLedgerRequest"))
                                .responseSchema(Schema.schema("DreamlensLedgerRowResponse"))
                                .build())));
    }

    @Test
    void dreamlens_ledger_update_문서화() throws Exception {
        DreamlensLedgerRequest req = sampleRequest();
        mockMvc.perform(put("/api/dreamlens-ledger/{id}", 101L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("dreamlens-ledger-update",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Etc")
                                .summary("드림렌즈 장부 행 수정 (전체 필드 교체)")
                                .description("사람이 수정하면 source 는 MANUAL 로 승격. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .pathParameters(parameterWithName("id").description("장부 행 PK"))
                                .requestFields(dreamlensRequestFields())
                                .responseFields(dreamlensRowFields())
                                .requestSchema(Schema.schema("DreamlensLedgerRequest"))
                                .responseSchema(Schema.schema("DreamlensLedgerRowResponse"))
                                .build())));
    }

    @Test
    void dreamlens_ledger_delete_문서화() throws Exception {
        mockMvc.perform(delete("/api/dreamlens-ledger/{id}", 101L)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("dreamlens-ledger-delete",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Etc")
                                .summary("드림렌즈 장부 행 삭제")
                                .description("data 는 null. MEDICAL/ALL.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MEDICAL/ALL"))
                                .pathParameters(parameterWithName("id").description("장부 행 PK"))
                                .responseFields(fieldWithPath("success").description("요청 성공 여부"))
                                .responseSchema(Schema.schema("DreamlensLedgerDeleteResponse"))
                                .build())));
    }

    // ─── helper ────────────────────────────────────────

    private static DreamlensLedgerRequest sampleRequest() {
        DreamlensLedgerRequest r = new DreamlensLedgerRequest();
        r.setEntryDate(LocalDate.of(2026, 8, 14));
        r.setVisitType("신규");
        r.setCustomerNo("C0000200");
        r.setCustomerName("김민수");
        r.setExaminer("이검사");
        r.setPurchaseType("드림렌즈");
        r.setRLensName("BE-DL");
        r.setRBox("15");
        r.setRLensSpec("BC 8.4");
        r.setRColor("clear");
        r.setLLensName("BE-DL");
        r.setLBox("15");
        r.setLLensSpec("BC 8.4");
        r.setLColor("clear");
        r.setDlNewRevenue(1_200_000);
        r.setDlRepurchaseRevenue(0);
        r.setMNewRevenue(0);
        r.setMRepurchaseRevenue(0);
        r.setHlNewRevenue(0);
        r.setHlRepurchaseRevenue(0);
        r.setDepositRevenue(0);
        r.setFittingRevenue(50_000);
        r.setSupplyRevenue(0);
        r.setTreatmentRevenue(0);
        r.setLensListPrice(1_500_000);
        r.setNextReservation("2026-08-28");
        r.setRecall1("");
        r.setRecall1Reservation("");
        r.setRecall1Absent("");
        r.setRecall2("");
        r.setRecall2Reservation("");
        r.setRecall2Absent("");
        r.setRecall3("");
        r.setRecall3Reservation("");
        r.setRecall3Absent("");
        return r;
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] dreamlensRequestFields() {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("entryDate").description("장부 기입일 YYYY-MM-DD (필수)"),
                fieldWithPath("visitType").description("내원 구분 (≤50)").optional().type(JsonFieldType.STRING),
                fieldWithPath("customerNo").description("고객번호 (≤50)").optional().type(JsonFieldType.STRING),
                fieldWithPath("customerName").description("고객명 (≤100)").optional().type(JsonFieldType.STRING),
                fieldWithPath("examiner").description("검사자 (≤100)").optional().type(JsonFieldType.STRING),
                fieldWithPath("purchaseType").description("구매 유형 (≤200)").optional().type(JsonFieldType.STRING),
                fieldWithPath("rLensName").description("우안 렌즈명 (≤100)").optional().type(JsonFieldType.STRING),
                fieldWithPath("rBox").description("우안 박스 (≤50)").optional().type(JsonFieldType.STRING),
                fieldWithPath("rLensSpec").description("우안 렌즈 스펙 (≤100)").optional().type(JsonFieldType.STRING),
                fieldWithPath("rColor").description("우안 색상 (≤50)").optional().type(JsonFieldType.STRING),
                fieldWithPath("rReturnDate").description("우안 반납일 YYYY-MM-DD").optional().type(JsonFieldType.STRING),
                fieldWithPath("lLensName").description("좌안 렌즈명").optional().type(JsonFieldType.STRING),
                fieldWithPath("lBox").description("좌안 박스").optional().type(JsonFieldType.STRING),
                fieldWithPath("lLensSpec").description("좌안 렌즈 스펙").optional().type(JsonFieldType.STRING),
                fieldWithPath("lColor").description("좌안 색상").optional().type(JsonFieldType.STRING),
                fieldWithPath("lReturnDate").description("좌안 반납일").optional().type(JsonFieldType.STRING),
                fieldWithPath("dlNewRevenue").description("드림렌즈 신규 매출 (≥0)"),
                fieldWithPath("dlRepurchaseRevenue").description("드림렌즈 재구매"),
                fieldWithPath("mNewRevenue").description("멀티(M) 신규"),
                fieldWithPath("mRepurchaseRevenue").description("멀티 재구매"),
                fieldWithPath("hlNewRevenue").description("하드(HL) 신규"),
                fieldWithPath("hlRepurchaseRevenue").description("하드 재구매"),
                fieldWithPath("depositRevenue").description("보증금"),
                fieldWithPath("fittingRevenue").description("피팅"),
                fieldWithPath("supplyRevenue").description("소모품"),
                fieldWithPath("treatmentRevenue").description("치료"),
                fieldWithPath("lensListPrice").description("렌즈 정가(참고, totalRevenue 미포함)"),
                fieldWithPath("nextReservation").description("다음 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall1").description("리콜 1차").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall1Reservation").description("리콜 1차 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall1Absent").description("리콜 1차 부재").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall2").description("리콜 2차").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall2Reservation").description("리콜 2차 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall2Absent").description("리콜 2차 부재").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall3").description("리콜 3차").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall3Reservation").description("리콜 3차 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath("recall3Absent").description("리콜 3차 부재").optional().type(JsonFieldType.STRING)
        };
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] dreamlensRowFields() {
        return prefixRow("data");
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] dreamlensRowListFields() {
        return prefixRow("data[]");
    }

    private static org.springframework.restdocs.payload.FieldDescriptor[] prefixRow(String p) {
        return new org.springframework.restdocs.payload.FieldDescriptor[] {
                fieldWithPath("success").description("요청 성공 여부"),
                fieldWithPath(p + ".id").description("장부 행 PK"),
                fieldWithPath(p + ".entryDate").description("장부 기입일"),
                fieldWithPath(p + ".visitType").description("내원 구분").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".customerNo").description("고객번호").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".customerName").description("고객명").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".examiner").description("검사자").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".purchaseType").description("구매 유형").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".rLensName").description("우안 렌즈명").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".rBox").description("우안 박스").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".rLensSpec").description("우안 렌즈 스펙").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".rColor").description("우안 색상").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".rReturnDate").description("우안 반납일").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".lLensName").description("좌안 렌즈명").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".lBox").description("좌안 박스").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".lLensSpec").description("좌안 렌즈 스펙").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".lColor").description("좌안 색상").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".lReturnDate").description("좌안 반납일").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".dlNewRevenue").description("드림렌즈 신규 매출"),
                fieldWithPath(p + ".dlRepurchaseRevenue").description("드림렌즈 재구매"),
                fieldWithPath(p + ".mNewRevenue").description("멀티 신규"),
                fieldWithPath(p + ".mRepurchaseRevenue").description("멀티 재구매"),
                fieldWithPath(p + ".hlNewRevenue").description("하드 신규"),
                fieldWithPath(p + ".hlRepurchaseRevenue").description("하드 재구매"),
                fieldWithPath(p + ".depositRevenue").description("보증금"),
                fieldWithPath(p + ".fittingRevenue").description("피팅"),
                fieldWithPath(p + ".supplyRevenue").description("소모품"),
                fieldWithPath(p + ".treatmentRevenue").description("치료"),
                fieldWithPath(p + ".lensListPrice").description("렌즈 정가 (참고)"),
                fieldWithPath(p + ".totalRevenue").description("매출 10종 합계 (서버 계산, 렌즈 정가 미포함)"),
                fieldWithPath(p + ".source").description("AUTO(배치 초안) | MANUAL(사람 입력·수정) — null 은 MANUAL 로 취급"),
                fieldWithPath(p + ".nextReservation").description("다음 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall1").description("리콜 1차").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall1Reservation").description("리콜 1차 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall1Absent").description("리콜 1차 부재").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall2").description("리콜 2차").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall2Reservation").description("리콜 2차 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall2Absent").description("리콜 2차 부재").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall3").description("리콜 3차").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall3Reservation").description("리콜 3차 예약").optional().type(JsonFieldType.STRING),
                fieldWithPath(p + ".recall3Absent").description("리콜 3차 부재").optional().type(JsonFieldType.STRING)
        };
    }
}
