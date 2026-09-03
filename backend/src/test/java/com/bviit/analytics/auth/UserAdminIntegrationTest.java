package com.bviit.analytics.auth;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.auth.entity.User;
import com.bviit.analytics.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 계정 관리 API 통합 테스트 (docs/auth/permissions.md § 4-2).
 *
 * <p>SecurityConfig 의 /api/admin/** 매처가 hasRole('ADMIN') 이라 STAFF·DIRECTOR 는 접근 자체가 403.
 * 자기 자신 롤·부서 변경 · 자기 삭제 · 마지막 ADMIN 삭제는 서비스 계층에서 400.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-user-admin-tests-1234",
        "spring.datasource.url=jdbc:h2:mem:user-admin-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
class UserAdminIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private User admin;
    private User staffMed;
    private String adminToken;
    private String staffToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        admin = userRepository.save(User.builder()
                .loginId("admin")
                .email("admin@bviit.com")
                .name("관리자")
                .password(passwordEncoder.encode("StrongTestPass123!"))
                .role(Role.ADMIN)
                .department(Department.ALL)
                .build());
        staffMed = userRepository.save(User.builder()
                .loginId("stf-med")
                .email("stf-med@bviit.com")
                .name("직원")
                .password(passwordEncoder.encode("StrongTestPass123!"))
                .role(Role.STAFF)
                .department(Department.MEDICAL)
                .build());
        adminToken = jwtUtil.generateToken(admin.getLoginId(), Role.ADMIN, Department.ALL);
        staffToken = jwtUtil.generateToken(staffMed.getLoginId(), Role.STAFF, Department.MEDICAL);
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    @Test
    void staffCannotAccessAdminUserApi() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/users")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminListsAllUsers() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                // 응답에 password 필드가 없어야 한다
                .andExpect(jsonPath("$.data[0].password").doesNotExist());
    }

    @Test
    void adminCreatesUser() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "loginId", "new-mkt",
                "email", "new-mkt@bviit.com",
                "name", "마케팅 신규",
                "password", "StrongTestPass123!",
                "role", "STAFF",
                "department", "MARKETING"
        ));
        mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.loginId").value("new-mkt"))
                .andExpect(jsonPath("$.data.role").value("STAFF"))
                .andExpect(jsonPath("$.data.department").value("MARKETING"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    void createRejectsInvalidRoleDepartmentCombo() throws Exception {
        // STAFF × ALL 은 금지
        String body = objectMapper.writeValueAsString(Map.of(
                "loginId", "bad",
                "email", "bad@bviit.com",
                "name", "잘못",
                "password", "StrongTestPass123!",
                "role", "STAFF",
                "department", "ALL"
        ));
        mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRejectsDuplicateLoginId() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "loginId", "admin",   // 이미 존재
                "email", "dup@bviit.com",
                "name", "중복",
                "password", "StrongTestPass123!",
                "role", "STAFF",
                "department", "MEDICAL"
        ));
        mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateOtherUserWorks() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("email", "stf-med2@bviit.com");
        req.put("name", "직원 수정");
        req.put("role", "STAFF");
        req.put("department", "MARKETING");  // 부서 변경
        req.put("password", null);           // 비밀번호 유지
        mockMvc.perform(MockMvcRequestBuilders.put("/api/admin/users/" + staffMed.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.department").value("MARKETING"));
    }

    @Test
    void updateSelfRejectsRoleChange() throws Exception {
        // ADMIN 이 자기 자신을 STAFF 로 낮추려 함 → 400
        Map<String, Object> req = new HashMap<>();
        req.put("email", admin.getEmail());
        req.put("name", admin.getName());
        req.put("role", "STAFF");
        req.put("department", "MEDICAL");
        req.put("password", null);
        mockMvc.perform(MockMvcRequestBuilders.put("/api/admin/users/" + admin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateSelfAllowsProfileEditWithoutRoleChange() throws Exception {
        // 롤·부서 유지하면서 이메일·이름만 변경 → OK
        Map<String, Object> req = new HashMap<>();
        req.put("email", "admin-renamed@bviit.com");
        req.put("name", "관리자(변경)");
        req.put("role", "ADMIN");
        req.put("department", "ALL");
        req.put("password", null);
        mockMvc.perform(MockMvcRequestBuilders.put("/api/admin/users/" + admin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("admin-renamed@bviit.com"));
    }

    @Test
    void deleteSelfRejected() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.delete("/api/admin/users/" + admin.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteAdminByAnotherAdminWorks() throws Exception {
        // 두 명 이상의 ADMIN 이 있을 때 서로 삭제 가능. 마지막 ADMIN 방어는 자기 삭제 방어와 실질적으로
        // 겹치지만(유일한 ADMIN 만 API 에 도달 가능) 방어 로직 자체는 유지해 이중 안전망을 만든다.
        User admin2 = userRepository.save(User.builder()
                .loginId("admin2")
                .email("admin2@bviit.com")
                .name("관리자2")
                .password(passwordEncoder.encode("StrongTestPass123!"))
                .role(Role.ADMIN)
                .department(Department.ALL)
                .build());

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/admin/users/" + admin2.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}
