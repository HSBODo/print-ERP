package com.example.app.auth;

import com.example.app.auth.config.JwtUtil;
import com.example.app.auth.entity.Department;
import com.example.app.auth.entity.Role;
import com.example.app.auth.entity.User;
import com.example.app.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-integration-tests-123456",
        // 컨텍스트 간 인메모리 DB 공유로 인한 시드 오염 방지 — 이 테스트 전용 DB 사용
        "spring.datasource.url=jdbc:h2:mem:auth-integration-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=true",
        "app.seed.admin-login-id=admin",
        "app.seed.admin-email=admin@example.com",
        "app.seed.admin-password=StrongTestPass123!",
        "app.seed.admin-name=관리자",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class AuthSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Test
    void loginReturnsWrappedTokenAndUser() throws Exception {
        // 시드된 ADMIN 계정으로 로그인 — 응답에 role · department 가 실려야 한다
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("admin", "StrongTestPass123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.loginId").value("admin"))
                .andExpect(jsonPath("$.data.user.email").value("admin@example.com"))
                .andExpect(jsonPath("$.data.user.name").isNotEmpty())
                .andExpect(jsonPath("$.data.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.user.department").value("ALL"));
    }

    @Test
    void loginNormalizesLoginIdBeforeAuthentication() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("  ADMIN  ", "StrongTestPass123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.loginId").value("admin"));
    }

    @Test
    void loginReturns401ForWrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload("admin", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("아이디 또는 비밀번호가 올바르지 않습니다."));
    }

    @Test
    void loginReturns400ForMalformedJson() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\":\"admin\","))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("요청 본문을 읽을 수 없습니다."));
    }

    @Test
    void spaRootIsPublic() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk());
    }

    @Test
    void spaLoginRouteIsPublic() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk());
    }

    @Test
    void 새로_추가한_화면_경로도_index_html_로_포워드된다() throws Exception {
        // SpaForwardController 를 고치지 않아도 새 최상위·중첩 경로 새로고침이 동작해야 한다.
        for (String path : new String[]{"/admin/accounts", "/orders", "/orders/1/edit"}) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                            .forwardedUrl("/index.html"));
        }
    }

    @Test
    void 예약_경로는_SPA_포워드하지_않는다() throws Exception {
        String token = jwtUtil.generateToken("admin", Role.ADMIN, Department.ALL);
        mockMvc.perform(get("/api/no-such-api").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mockMvc.perform(get("/assets/no-such-file.js"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/favicon-missing.svg"))
                .andExpect(status().isNotFound());
    }


    @Test
    void protectedEndpointReturns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/test/protected"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns401ForBlankBearerToken() throws Exception {
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer   "))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns401ForInvalidToken() throws Exception {
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    void protectedEndpointReturns200ForValidToken() throws Exception {
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + jwtUtil.generateToken("admin", Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("admin"));
    }


    // ─── 롤 + 부서 축 커버리지 ────────────

    @Test
    void staffTokenIsForbiddenOnAdminApi() throws Exception {
        // STAFF 는 /api/admin/** 접근 금지.
        TestUsers.ensure(userRepository, "staff-a", Role.STAFF, Department.TEAM_A);
        String token = jwtUtil.generateToken("staff-a", Role.STAFF, Department.TEAM_A);
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void directorTokenIsForbiddenOnAdminApi() throws Exception {
        // DIRECTOR 도 시스템 조작 불가 — 관리자 API 는 ADMIN 만.
        TestUsers.ensure(userRepository, "director", Role.DIRECTOR, Department.ALL);
        String token = jwtUtil.generateToken("director", Role.DIRECTOR, Department.ALL);
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminTokenCanAccessAdminApi() throws Exception {
        String token = jwtUtil.generateToken("admin", Role.ADMIN, Department.ALL);
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // ─── 권한은 토큰이 아니라 DB 의 현재 값으로 판정 ────────────

    @Test
    void 삭제된_계정의_토큰은_401() throws Exception {
        User ghost = TestUsers.ensure(userRepository, "deleted-admin", Role.ADMIN, Department.ALL);
        String token = jwtUtil.generateToken("deleted-admin", Role.ADMIN, Department.ALL);
        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        userRepository.delete(ghost);

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 강등된_관리자의_토큰은_즉시_403() throws Exception {
        User user = TestUsers.ensure(userRepository, "demoted-admin", Role.ADMIN, Department.ALL);
        // 토큰은 ADMIN 시절에 발급
        String token = jwtUtil.generateToken("demoted-admin", Role.ADMIN, Department.ALL);

        user.changeRoleAndDepartment(Role.STAFF, Department.TEAM_A);
        userRepository.save(user);

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        userRepository.delete(user);
    }

    @Test
    void legacyUserRoleTokenReturns401() throws Exception {
        // Role.USER 는 삭제된 값. 옛 토큰이 들어오면 JwtUtil.getRoleFromToken 이 JwtException 을 던져
        // JwtAuthenticationFilter 가 조용히 인증을 건너뛴다 → anyRequest().authenticated() 로 401 처리
        String legacyToken = buildTokenWithClaims("admin", "USER", null);
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + legacyToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void unknownRoleTokenReturns401() throws Exception {
        // 그 외 알 수 없는 role 값도 grace 없이 401.
        String unknownRoleToken = buildTokenWithClaims("admin", "SUPERUSER", "ALL");
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + unknownRoleToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenWithoutDeptClaimReturns401() throws Exception {
        // 옛 스키마 (role 만 있고 dept 없음) 도 grace 없이 401.
        String noDept = buildTokenWithClaims("admin", "ADMIN", null);
        mockMvc.perform(get("/api/test/protected")
                        .header("Authorization", "Bearer " + noDept))
                .andExpect(status().isUnauthorized());
    }

    /**
     * 스키마 이전 (또는 잘못된) role 값을 임의로 담아 서명 유효한 JWT 를 생성한다.
     * JwtUtil.generateToken(Role) 은 enum 만 받아 옛 값을 못 만들므로 테스트 전용 로컬 빌더.
     */
    private String buildTokenWithClaims(String subject, String roleClaim, String deptClaim) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        var builder = Jwts.builder()
                .subject(subject)
                .claim("role", roleClaim)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key);
        if (deptClaim != null) {
            builder.claim("dept", deptClaim);
        }
        return builder.compact();
    }

    private record LoginPayload(String loginId, String password) {
    }
}
