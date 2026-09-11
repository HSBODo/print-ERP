package com.bviit.analytics.auth.entity;

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

    // columnDefinition의 DEFAULT 'STAFF' — 기존 데이터가 있는 테이블에 NOT NULL 컬럼을
    // ALTER 로 추가할 때(Hibernate ddl-auto=update) 실패 방지. Postgres/H2(PostgreSQL 모드) 공통 문법.
    // 기존 'USER' 값 치환은 개발 DB 에 수동 SQL 로 처리 (docs/auth/permissions.md § 5-1 하단).
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'STAFF'")
    @Builder.Default
    private Role role = Role.STAFF;

    // department 는 4단 롤 도입 시 신설된 부서 축. 기본값 'MEDICAL' — 기존 STAFF 사용자에게 안전한 매핑.
    // ADMIN·DIRECTOR 는 반드시 Department.ALL 로 저장 (docs/auth/permissions.md § 2-3).
    // 조합 제약(role ↔ department)은 DB CHECK 제약 users_role_department_scope_ck 로 강제한다
    // (개발 DB 는 수동 SQL 로 부여 · docs/auth/permissions.md § 5-1 하단).
    //
    // 참고 — 이 축은 "부서(department)" 이며, 향후 "소속(회사·법인)" 축이 별도로 추가될 수 있다.
    @Enumerated(EnumType.STRING)
    @Column(name = "department", nullable = false, length = 20, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'MEDICAL'")
    @Builder.Default
    private Department department = Department.MEDICAL;

    // ─── 상태 변경 메서드 (Setter 대신 · 계정 관리 UI 에서 사용) ────────────

    /** 이메일·이름 변경. loginId 는 로그인 자격이므로 여기서 안 바꾼다. */
    public void updateProfile(String newEmail, String newName) {
        this.email = newEmail;
        this.name = newName;
    }

    /**
     * 롤·부서를 한 번에 갱신. 조합이 유효해야 한다
     * (ADMIN·DIRECTOR ↔ ALL, MANAGER·STAFF ↔ MEDICAL/MARKETING/OVERSEAS_MARKETING).
     * DB CHECK 제약으로 최종 방어되지만 여기서 먼저 예외를 던져 400 을 반환한다.
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

    /** ADMIN·DIRECTOR ↔ ALL · MANAGER·STAFF ↔ MEDICAL/MARKETING/OVERSEAS_MARKETING */
    public static boolean isValidCombination(Role role, Department department) {
        if (role == Role.ADMIN || role == Role.DIRECTOR) {
            return department == Department.ALL;
        }
        return department == Department.MEDICAL
                || department == Department.MARKETING
                || department == Department.OVERSEAS_MARKETING;
    }
}
