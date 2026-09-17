package com.bviit.analytics.batch.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.batch.controller.BatchStatusController;
import com.bviit.analytics.batch.dto.BatchLastSuccessResponse;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/batch/last-success 문서화.
 *
 * BatchStatusController 는 @Profile("postgres-mart") 라 H2 기본 프로파일에서 빈이 안 생긴다.
 * @TestConfiguration 으로 목킹된 BatchRunLogRepository 를 주입해 컨트롤러를 명시적으로 등록한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-batch-status-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:batch-status-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
@Import(BatchStatusDocsTest.TestConfig.class)
class BatchStatusDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired BatchRunLogRepository runLogRepository;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.STAFF, Department.MEDICAL);
    }

    @BeforeEach
    void stubRepository() {
        Mockito.reset(runLogRepository);
        Mockito.when(runLogRepository.findLastSuccessfulDaily()).thenReturn(Optional.of(
                new BatchLastSuccessResponse(
                        LocalDate.of(2026, 9, 15),
                        LocalDateTime.of(2026, 9, 16, 3, 15, 0))));
    }

    @Test
    void last_success_문서화() throws Exception {
        mockMvc.perform(get("/api/batch/last-success").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("batch-last-success",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Batch")
                                .summary("마지막 DAILY 배치 성공 정보")
                                .description("가장 최근 성공한 DAILY 배치의 커버 날짜(D-1)와 완료 시각. "
                                        + "이력이 없으면 data=null (ApiResponse @JsonInclude(NON_NULL) 로 응답에서 생략). "
                                        + "인증된 사용자면 누구나 접근 가능(관리자 API 아님).")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token}"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.targetDate").description("배치 대상 날짜 (YYYY-MM-DD, D-1 커버)"),
                                        fieldWithPath("data.finishedAt").description("배치 완료 시각 (ISO 로컬 타임)"))
                                .responseSchema(Schema.schema("BatchLastSuccessResponse"))
                                .build())));
    }

    /**
     * BatchStatusController 는 @Profile("postgres-mart") 로 기본 프로파일에선 등록되지 않는다.
     * @Bean 등록 시 클래스-레벨 @Profile 은 무시되므로 여기서 명시적으로 만든다.
     * BatchRunLogRepository 는 목킹 — 실제 마트 DB 없이 계약만 검증한다.
     */
    @TestConfiguration
    static class TestConfig {
        @Bean
        BatchRunLogRepository batchRunLogRepository() {
            return Mockito.mock(BatchRunLogRepository.class);
        }

        @Bean
        BatchStatusController batchStatusController(BatchRunLogRepository repo) {
            return new BatchStatusController(repo);
        }
    }
}
