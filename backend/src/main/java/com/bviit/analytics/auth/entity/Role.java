package com.bviit.analytics.auth.entity;

/**
 * 사용자 권한. Spring Security 규약을 따라 ROLE_ 접두사를 붙인 authority 로 매핑된다
 * (예: ADMIN → ROLE_ADMIN). {@link #authority()} 참고.
 *
 * <p>4단 롤 (docs/auth/permissions.md § 2-1):
 * <ul>
 *   <li>{@link #ADMIN}    — 정책·시스템 관리 (개발자 전용). 부서 소속 없음(department = {@code ALL}).</li>
 *   <li>{@link #DIRECTOR} — 임원·경영진. 부서 소속 없음(department = {@code ALL}). 데이터는 두 그룹 전부 열람하지만 시스템 조작 불가.</li>
 *   <li>{@link #MANAGER}  — 조직 의사결정 (개념상 자리만 · 지금은 STAFF 와 동일 권한). 부서 값 필수.</li>
 *   <li>{@link #STAFF}    — 실무 조작. 부서 값 필수.</li>
 * </ul>
 *
 * <p>롤/부서 조합은 DB CHECK 제약 {@code users_role_department_scope_ck} 로 강제된다
 * (개발 DB 는 수동 SQL 로 부여 · docs/auth/permissions.md § 5-1 하단 참조).
 */
public enum Role {
    ADMIN,
    DIRECTOR,
    MANAGER,
    STAFF;

    public String authority() {
        return "ROLE_" + name();
    }
}
