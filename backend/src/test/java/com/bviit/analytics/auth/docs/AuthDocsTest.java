package com.bviit.analytics.auth.docs;

import com.bviit.analytics.auth.dto.LoginRequest;
import com.bviit.analytics.auth.dto.LoginResponse;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.auth.service.AuthService;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/auth/login 문서화 — 자격증명은 자리표시자만 노출한다(전략 §3).
 * AuthService 를 목킹해 실제 사용자·비밀번호 검증 없이 카나리 응답을 반환한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-auth-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:auth-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class AuthDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean AuthService authService;

    @BeforeEach
    void stubLogin() {
        // 응답 예시는 계약 노출용 자리표시자다. 실토큰·실사용자 정보는 노출하지 않는다(전략 §3).
        when(authService.login(any(LoginRequest.class))).thenReturn(new LoginResponse(
                "eyJhbGciOiJIUzI1NiJ9.<jwt-payload>.<signature>",
                new LoginResponse.UserDto(1L, "your-admin-id", "admin@example.com",
                        "관리자", Role.ADMIN, Department.ALL)));
    }

    @Test
    void 로그인_문서화() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "loginId", "your-admin-id",
                "password", "your-password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andDo(document("auth-login",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        requestFields(
                                fieldWithPath("loginId").description("로그인 ID (소문자 자동 변환)"),
                                fieldWithPath("password").description("비밀번호")),
                        responseFields(
                                fieldWithPath("success").description("요청 성공 여부 (true)"),
                                fieldWithPath("data.token").description("JWT Bearer 토큰. 이후 요청은 `Authorization: Bearer <token>` 헤더 필요"),
                                fieldWithPath("data.user.id").description("사용자 PK"),
                                fieldWithPath("data.user.loginId").description("로그인 ID"),
                                fieldWithPath("data.user.email").description("이메일"),
                                fieldWithPath("data.user.name").description("이름"),
                                fieldWithPath("data.user.role").description("Role — ADMIN · DIRECTOR · MANAGER · STAFF"),
                                fieldWithPath("data.user.department").description("Department — ALL · MEDICAL · MARKETING · OVERSEAS_MARKETING")),
                        resource(ResourceSnippetParameters.builder()
                                .tag("Auth")
                                .summary("로그인 (JWT 발급)")
                                .description("아이디·비밀번호로 Bearer 토큰을 발급받는다. 실계정은 관리자에게 문의.")
                                .requestSchema(Schema.schema("LoginRequest"))
                                .responseSchema(Schema.schema("LoginResponse"))
                                .build())));
    }
}
