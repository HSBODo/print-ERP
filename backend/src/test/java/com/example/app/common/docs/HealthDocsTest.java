package com.example.app.common.docs;

import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/health 문서화 — Docker HEALTHCHECK·LB 프로브용 공개 엔드포인트.
 *
 * <p>인증 없음(SecurityConfig `/api/health` GET permitAll). 의존성 체크 없이 프로세스 liveness 만 확인.
 * DB 블립에도 재시작이 트리거되지 않도록 무조건 200 반환.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-health-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:health-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class HealthDocsTest {

    @Autowired MockMvc mockMvc;

    @Test
    void health_liveness_문서화() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andDo(document("health-liveness",
                        preprocessRequest(modifyUris().host("api.example.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Health")
                                .summary("애플리케이션 liveness")
                                .description("Docker HEALTHCHECK·로드밸런서 헬스 프로브용. "
                                        + "SecurityConfig `/api/health` GET permitAll — JWT·부서 gate 없이 호출. "
                                        + "의존성(DB 등) 체크 없이 프로세스가 응답 가능한지만 확인 — DB 블립에도 재시작이 트리거되지 않도록 무조건 200.")
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부 (항상 true)"),
                                        fieldWithPath("data.status").description("상태 문자열 — 'UP' 고정"),
                                        fieldWithPath("data.timestamp").description("응답 시각 ISO-8601 (예: 2026-09-17T02:00:00Z)"),
                                        fieldWithPath("data.uptimeSeconds").description("프로세스 uptime (초)"))
                                .responseSchema(Schema.schema("HealthResponse"))
                                .build())));
    }
}
