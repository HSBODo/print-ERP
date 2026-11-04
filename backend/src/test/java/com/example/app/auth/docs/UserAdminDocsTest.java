package com.example.app.auth.docs;

import com.example.app.auth.config.JwtUtil;
import com.example.app.auth.dto.UserCreateRequest;
import com.example.app.auth.dto.UserRow;
import com.example.app.auth.dto.UserUpdateRequest;
import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
import com.example.app.auth.TestUsers;
import com.example.app.auth.repository.UserRepository;
import com.example.app.auth.service.UserAdminService;
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
import java.util.Map;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import org.springframework.restdocs.payload.JsonFieldType;

import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/admin/users/** 5개 엔드포인트 문서화. UserAdminService 를 목킹해 카나리 UserRow 응답을 만든다.
 * ADMIN 롤 전용(SecurityConfig 매처).
 *
 * 파라미터/헤더/필드는 ResourceSnippetParameters.builder 로 전달해야 OpenAPI 스키마에 반영된다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-user-admin-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:user-admin-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class UserAdminDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @MockitoBean UserAdminService userAdminService;

    private String bearer() {
        TestUsers.ensure(userRepository, "docs-tester", Role.ADMIN, Department.ALL);
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubService() {
        UserRow row1 = new UserRow(1L, "admin", "admin@example.com", "관리자", Role.ADMIN, Department.ALL);
        UserRow row2 = new UserRow(2L, "staff01", "staff01@example.com", "김직원", Role.STAFF, Department.TEAM_A);

        when(userAdminService.listUsers()).thenReturn(List.of(row1, row2));
        when(userAdminService.getUser(anyLong())).thenReturn(row1);
        when(userAdminService.createUser(any(UserCreateRequest.class))).thenReturn(
                new UserRow(3L, "new-user", "newuser@example.com", "신규", Role.STAFF, Department.TEAM_B));
        when(userAdminService.updateUser(anyLong(), any(UserUpdateRequest.class), anyString())).thenReturn(
                new UserRow(2L, "staff01", "staff01@example.com", "김직원(수정)", Role.MANAGER, Department.TEAM_A));
        doNothing().when(userAdminService).deleteUser(anyLong(), anyString());
    }

    @Test
    void users_list_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("users-list",
                        preprocessRequest(modifyUris().host("api.example.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("UserAdmin")
                                .summary("사용자 목록")
                                .description("등록된 모든 사용자를 조회한다. 비밀번호는 응답에 포함되지 않는다. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].id").description("사용자 PK"),
                                        fieldWithPath("data[].loginId").description("로그인 ID"),
                                        fieldWithPath("data[].email").description("이메일"),
                                        fieldWithPath("data[].name").description("이름"),
                                        fieldWithPath("data[].role").description("Role — ADMIN · DIRECTOR · MANAGER · STAFF"),
                                        fieldWithPath("data[].department").description("Department — ALL · TEAM_A · TEAM_B"))
                                .responseSchema(Schema.schema("UserListResponse"))
                                .build())));
    }

    @Test
    void users_get_문서화() throws Exception {
        mockMvc.perform(get("/api/admin/users/{id}", 1L).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("users-get",
                        preprocessRequest(modifyUris().host("api.example.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("UserAdmin")
                                .summary("사용자 단일 조회")
                                .description("PK 로 사용자를 조회한다. 존재하지 않으면 404. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .pathParameters(parameterWithName("id").description("사용자 PK"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.id").description("사용자 PK"),
                                        fieldWithPath("data.loginId").description("로그인 ID"),
                                        fieldWithPath("data.email").description("이메일"),
                                        fieldWithPath("data.name").description("이름"),
                                        fieldWithPath("data.role").description("Role"),
                                        fieldWithPath("data.department").description("Department"))
                                .responseSchema(Schema.schema("UserResponse"))
                                .build())));
    }

    @Test
    void users_create_문서화() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "loginId", "new-user",
                "email", "newuser@example.com",
                "name", "신규",
                "password", "at-least-8-chars",
                "role", "STAFF",
                "department", "TEAM_B"));

        mockMvc.perform(post("/api/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andDo(document("users-create",
                        preprocessRequest(modifyUris().host("api.example.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("UserAdmin")
                                .summary("사용자 생성")
                                .description("신규 사용자 등록. loginId 중복 시 409. 비밀번호는 최소 8자. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .requestFields(
                                        fieldWithPath("loginId").description("로그인 ID (2~50자, 소문자 자동 변환)"),
                                        fieldWithPath("email").description("이메일 (200자 이내)"),
                                        fieldWithPath("name").description("이름 (1~100자)"),
                                        fieldWithPath("password").description("비밀번호 (8~200자)"),
                                        fieldWithPath("role").description("Role — ADMIN · DIRECTOR · MANAGER · STAFF"),
                                        fieldWithPath("department").description("Department — ALL · TEAM_A · TEAM_B"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.id").description("생성된 사용자 PK"),
                                        fieldWithPath("data.loginId").description("로그인 ID"),
                                        fieldWithPath("data.email").description("이메일"),
                                        fieldWithPath("data.name").description("이름"),
                                        fieldWithPath("data.role").description("Role"),
                                        fieldWithPath("data.department").description("Department"))
                                .requestSchema(Schema.schema("UserCreateRequest"))
                                .responseSchema(Schema.schema("UserResponse"))
                                .build())));
    }

    @Test
    void users_update_문서화() throws Exception {
        // password 는 optional — 빈 문자열은 @Size(min=8) 로 400 이라 아예 생략한다(유지 동작).
        String body = objectMapper.writeValueAsString(Map.of(
                "email", "staff01@example.com",
                "name", "김직원(수정)",
                "role", "MANAGER",
                "department", "TEAM_A"));

        mockMvc.perform(put("/api/admin/users/{id}", 2L)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andDo(document("users-update",
                        preprocessRequest(modifyUris().host("api.example.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("UserAdmin")
                                .summary("사용자 편집")
                                .description("이메일·이름·롤·부서 변경. password 는 빈 문자열/null 이면 유지, 주면 8자 이상. "
                                        + "자기 자신의 롤·부서 변경은 400 (자충수 방지). ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .pathParameters(parameterWithName("id").description("사용자 PK"))
                                .requestFields(
                                        fieldWithPath("email").description("이메일"),
                                        fieldWithPath("name").description("이름"),
                                        fieldWithPath("role").description("Role"),
                                        fieldWithPath("department").description("Department"),
                                        fieldWithPath("password").type(JsonFieldType.STRING).description("비밀번호 (선택 · 주면 8자 이상, 빈 문자열 금지)").optional())
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data.id").description("사용자 PK"),
                                        fieldWithPath("data.loginId").description("로그인 ID"),
                                        fieldWithPath("data.email").description("이메일"),
                                        fieldWithPath("data.name").description("이름"),
                                        fieldWithPath("data.role").description("Role"),
                                        fieldWithPath("data.department").description("Department"))
                                .requestSchema(Schema.schema("UserUpdateRequest"))
                                .responseSchema(Schema.schema("UserResponse"))
                                .build())));
    }

    @Test
    void users_delete_문서화() throws Exception {
        mockMvc.perform(delete("/api/admin/users/{id}", 2L).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("users-delete",
                        preprocessRequest(modifyUris().host("api.example.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("UserAdmin")
                                .summary("사용자 삭제")
                                .description("사용자 삭제. 자기 자신·마지막 ADMIN 은 400. ADMIN 전용.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — ADMIN 필수"))
                                .pathParameters(parameterWithName("id").description("삭제 대상 사용자 PK"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data").type(JsonFieldType.NULL).description("null (ApiResponse @JsonInclude(NON_NULL) 로 실제 응답에선 생략됨)").optional())
                                .responseSchema(Schema.schema("EmptyResponse"))
                                .build())));
    }
}
