package com.example.app.auth.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "login_id", unique = true, nullable = false)
    private String loginId;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Setter(AccessLevel.NONE)
    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'STAFF'")
    @Builder.Default
    private Role role = Role.STAFF;

    // ADMIN·DIRECTOR 는 반드시 Department.ALL 로 저장한다 — 조합 규칙은 isValidCombination.
    @Enumerated(EnumType.STRING)
    @Column(name = "department", nullable = false, length = 20, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'TEAM_A'")
    @Builder.Default
    private Department department = Department.TEAM_A;

    // ─── 상태 변경 메서드 (Setter 대신 · 계정 관리 UI 에서 사용) ────────────

    /** 이메일·이름 변경. loginId 는 로그인 자격이므로 여기서 안 바꾼다. */
    public void updateProfile(String newEmail, String newName) {
        this.email = newEmail;
        this.name = newName;
    }

    /**
     * 롤·부서를 한 번에 갱신. 조합이 유효해야 한다
     * (ADMIN·DIRECTOR ↔ ALL, MANAGER·STAFF ↔ ALL 이외의 부서). 위반 시 예외 → 400.
     */
    public void changeRoleAndDepartment(Role newRole, Department newDepartment) {
        if (!isValidCombination(newRole, newDepartment)) {
            throw new IllegalArgumentException(
                    "롤·부서 조합이 유효하지 않습니다: role=" + newRole + ", department=" + newDepartment);
        }
        this.role = newRole;
        this.department = newDepartment;
    }

    /** 이미 인코딩된 비밀번호로 교체 (호출자가 BCryptPasswordEncoder 로 해시). */
    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    /** ADMIN·DIRECTOR ↔ ALL · MANAGER·STAFF ↔ ALL 이외의 부서 */
    public static boolean isValidCombination(Role role, Department department) {
        if (role == null || department == null) {
            return false;
        }
        if (role == Role.ADMIN || role == Role.DIRECTOR) {
            return department == Department.ALL;
        }
        return department != Department.ALL;
    }
}
