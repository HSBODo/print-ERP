package com.bviit.analytics.marketing.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.marketing.dto.AdSpendItem;
import com.bviit.analytics.marketing.dto.ChannelLensCostItem;
import com.bviit.analytics.marketing.dto.LensCostItem;
import com.bviit.analytics.marketing.repository.ChannelProfitMartRepository;
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

import java.util.List;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/stats/channel-profit/** 5개 엔드포인트 문서화.
 * ChannelProfitMartRepository 를 목킹해 카나리 응답을 만든다. MARKETING 부서 전용.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-channel-profit-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:channel-profit-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ChannelProfitDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ChannelProfitMartRepository repository;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubRepository() {
        when(repository.findChannelLensCost(anyString(), anyString())).thenReturn(List.of(
                ChannelLensCostItem.builder()
                        .channel("네이버").lensEyes(120).lensEyesPriced(110).lensEyesUnpriced(10)
                        .lensCostManwon(4400L).build()));
        when(repository.findAdSpend(anyString())).thenReturn(List.of(
                AdSpendItem.builder().ym("2026-07").media("naver_reserve").amountManwon(1200).build(),
                AdSpendItem.builder().ym("2026-07").media("modoodoc").amountManwon(300).build()));
        when(repository.saveAdSpend(anyList())).thenReturn(2);
        when(repository.findLensCosts()).thenReturn(List.of(
                LensCostItem.builder().opType("icl").unitCostManwon(40).build(),
                LensCostItem.builder().opType("tIcl").unitCostManwon(55).build()));
        when(repository.saveLensCosts(anyList())).thenReturn(2);
    }

    @Test
    void lens_cost_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/channel-profit/lens-cost")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("channel-profit-lens-cost",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ChannelProfit")
                                .summary("채널별 렌즈 원가 (안 단위)")
                                .description("실제 수술명을 안(眼) 단위로 펼쳐 단가표와 이어 낸 결과. "
                                        + "단가가 없는 안은 lensEyesUnpriced 로 따로 세어 원가 미완성을 표시한다. "
                                        + "MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING 부서 or ADMIN"))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작일 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("조회 종료일 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].channel").description("유입 채널명"),
                                        fieldWithPath("data[].lensEyes").description("렌즈가 들어가는 수술 총 안수"),
                                        fieldWithPath("data[].lensEyesPriced").description("단가가 입력된 안수"),
                                        fieldWithPath("data[].lensEyesUnpriced").description("단가 미입력 안수 (>0 이면 원가·공헌이익 미완성)"),
                                        fieldWithPath("data[].lensCostManwon").description("입력된 단가만 합산한 렌즈 원가 (만원)"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("ChannelLensCostListResponse"))
                                .build())));
    }

    @Test
    void ad_spend_get_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/channel-profit/ad-spend")
                        .param("ym", "2026-07")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("channel-profit-ad-spend-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ChannelProfit")
                                .summary("월별 매체 광고비 조회")
                                .description("media 는 유입채널이 아니라 광고 상품 코드(naver_reserve · naver_search · modoodoc). "
                                        + "매출 귀속이 안 되는 상품도 비용은 기록해 전체 광고비를 파악한다.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING 부서 or ADMIN"))
                                .queryParameters(parameterWithName("ym").description("조회 월 (YYYY-MM)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].ym").description("월 (YYYY-MM)"),
                                        fieldWithPath("data[].media").description("광고 상품 코드"),
                                        fieldWithPath("data[].amountManwon").description("광고비 (만원)"),
                                        subsectionWithPath("meta").description("응답 메타 (source, locked)"))
                                .responseSchema(Schema.schema("AdSpendListResponse"))
                                .build())));
    }

    @Test
    void ad_spend_put_문서화() throws Exception {
        String body = objectMapper.writeValueAsString(List.of(
                new AdSpendItem("2026-07", "naver_reserve", 1200),
                new AdSpendItem("2026-07", "modoodoc", 300)));

        mockMvc.perform(put("/api/stats/channel-profit/ad-spend")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andDo(document("channel-profit-ad-spend-put",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ChannelProfit")
                                .summary("월별 매체 광고비 저장 (upsert)")
                                .description("월×매체 조합으로 upsert. 동일 조합 재요청 시 값만 갱신. MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING 부서 or ADMIN"))
                                .requestFields(
                                        fieldWithPath("[].ym").description("월 (YYYY-MM 형식)"),
                                        fieldWithPath("[].media").description("광고 상품 코드"),
                                        fieldWithPath("[].amountManwon").description("광고비 (만원, 0 이상)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.saved").description("저장된 행 수"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .requestSchema(Schema.schema("AdSpendUpsertRequest"))
                                .responseSchema(Schema.schema("AdSpendUpsertResponse"))
                                .build())));
    }

    @Test
    void lens_price_get_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/channel-profit/lens-price")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("channel-profit-lens-price-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ChannelProfit")
                                .summary("렌즈 단가표 조회")
                                .description("시술유형별 렌즈 매입 단가 (안 1개당 만원). "
                                        + "opType 은 surgery_op_type() 코드와 같아야 한다 (icl · tIcl · kpl · tKpl · viva).")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING 부서 or ADMIN"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].opType").description("시술 유형 코드"),
                                        fieldWithPath("data[].unitCostManwon").description("안 1개당 매입 단가 (만원)"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .responseSchema(Schema.schema("LensCostListResponse"))
                                .build())));
    }

    @Test
    void lens_price_put_문서화() throws Exception {
        String body = objectMapper.writeValueAsString(List.of(
                new LensCostItem("icl", 40),
                new LensCostItem("tIcl", 55)));

        mockMvc.perform(put("/api/stats/channel-profit/lens-price")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andDo(document("channel-profit-lens-price-put",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ChannelProfit")
                                .summary("렌즈 단가 저장")
                                .description("존재하는 op_type 만 갱신 (새 유형은 만들지 않는다). MARKETING 부서 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING 부서 or ADMIN"))
                                .requestFields(
                                        fieldWithPath("[].opType").description("시술 유형 코드 (기존 행만)"),
                                        fieldWithPath("[].unitCostManwon").description("안 1개당 매입 단가 (만원, 0 이상)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.saved").description("갱신된 행 수"),
                                        subsectionWithPath("meta").description("응답 메타"))
                                .requestSchema(Schema.schema("LensCostUpsertRequest"))
                                .responseSchema(Schema.schema("LensCostUpsertResponse"))
                                .build())));
    }
}
