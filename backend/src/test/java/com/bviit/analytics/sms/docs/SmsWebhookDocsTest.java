package com.bviit.analytics.sms.docs;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SolapiMessageReportEvent;
import com.bviit.analytics.sms.service.SolapiWebhookService;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/sms/webhook/solapi 문서화 — 솔라피 발송 결과 웹훅 수신부.
 *
 * <p><b>인증</b>: JWT 없음 (SecurityConfig permitAll). 대신 X-Solapi-Secret 헤더값을
 * SOLAPI_WEBHOOK_SECRET 과 시간 상수로 직접 비교. secret 미설정 시 검증 skip(로컬 부트스트랩).
 *
 * <p><b>주의</b>: 솔라피 공식 Node 예시는 sha1(secret) 이지만 실제 payload 는 콘솔 시크릿을
 * 그대로 헤더에 실어 보낸다 (2026-09 실측). 서버는 원본 비교를 쓴다.
 *
 * <p>SolapiProperties 는 mock 으로 isWebhookSecretConfigured()=false 를 반환해 검증을 건너뛰게 한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-sms-webhook-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:sms-webhook-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class SmsWebhookDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean SolapiProperties solapiProperties;
    @MockitoBean SolapiWebhookService webhookService;

    @BeforeEach
    void stubServices() {
        Mockito.reset(solapiProperties, webhookService);
        // secret 미설정 → 검증 skip 경로 (로컬 부트스트랩용) — 헤더 없이도 200
        when(solapiProperties.isWebhookSecretConfigured()).thenReturn(false);
        when(webhookService.applyMessageReports(anyList())).thenReturn(1);
    }

    @Test
    void sms_webhook_solapi_문서화() throws Exception {
        List<SolapiMessageReportEvent> events = List.of(new SolapiMessageReportEvent(
                "M20260814-0001", "G20260814-0001", "ATA",
                "01012345678", "025091234",
                "2000", "OK",
                "2026-08-14T10:30:05", "2026-08-14T10:30:10", "2026-08-14T10:30:11",
                "K1"));
        mockMvc.perform(post("/api/sms/webhook/solapi")
                        .header("X-Solapi-Event-Name", "SINGLE-REPORT")
                        .header("X-Solapi-Secret", "your-webhook-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(events)))
                .andExpect(status().isOk())
                .andDo(document("sms-webhook-solapi",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("SmsWebhook")
                                .summary("솔라피 웹훅 수신 (JWT 없음 · 서명 검증으로 대체)")
                                .description("솔라피가 발송 결과를 배열(SINGLE-REPORT)로 던진다. "
                                        + "X-Solapi-Event-Name 이 SINGLE-REPORT 아니면 조용히 200 (콘솔 설정 확장 대비). "
                                        + "X-Solapi-Secret 을 SOLAPI_WEBHOOK_SECRET 과 시간 상수로 직접 비교 — 불일치 시 401. "
                                        + "secret 미설정 시 검증 skip (로컬 부트스트랩). "
                                        + "⚠️ 솔라피 공식 Node 예시(sha1)와 다르게 원본 그대로 실어 보낸다 (2026-09 실측). "
                                        + "처리 도중 예외가 나도 200 반환 — 웹훅은 8회 실패 후 자동 INACTIVE 라 재전송이 오히려 해롭다. "
                                        + "놓친 건은 SmsResultSyncJob (하루 1회) 이 걷어낸다.")
                                .requestHeaders(
                                        headerWithName("X-Solapi-Event-Name").description("이벤트명 — SINGLE-REPORT 만 실처리, 그 외는 200 반환 후 skip"),
                                        headerWithName("X-Solapi-Secret").description("SOLAPI_WEBHOOK_SECRET 원본 (콘솔값 그대로) — 미설정 환경이면 검증 skip"))
                                .requestFields(
                                        fieldWithPath("[].messageId").description("메시지 PK (조회 키 · 우리가 실제 사용)"),
                                        fieldWithPath("[].groupId").description("발송 그룹 ID"),
                                        fieldWithPath("[].type").description("발송 유형 — SMS·LMS·MMS·ATA·CTA·CTI·NSA·RCS_* (요청 ALIMTALK 인데 ATA 아니면 대체발송)"),
                                        fieldWithPath("[].to").description("수신 번호"),
                                        fieldWithPath("[].from").description("발신 번호"),
                                        fieldWithPath("[].statusCode").description("상태 코드 (2000 성공) — 우리가 성공/실패 판정에 사용"),
                                        fieldWithPath("[].statusMessage").description("상태 메시지"),
                                        fieldWithPath("[].dateProcessed").description("솔라피 처리 시각 ISO-8601"),
                                        fieldWithPath("[].dateReported").description("리포트 시각 ISO-8601"),
                                        fieldWithPath("[].dateReceived").description("단말 도달 시각 ISO-8601 (우리가 이력에 저장)"),
                                        fieldWithPath("[].networkCode").description("통신망 코드"))
                                .requestSchema(Schema.schema("SolapiMessageReportEventList"))
                                .build())));
    }
}
