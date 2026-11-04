package com.example.app.auth.entity;

/**
 * 사용자 권한. Spring Security 규약을 따라 ROLE_ 접두사를 붙인 authority 로 매핑된다
 * (예: ADMIN → ROLE_ADMIN). {@link #authority()} 참고.
 *
 * <ul>
 *   <li>{@link #ADMIN}    — 시스템 관리 (계정 관리 등). department = {@code ALL}.</li>
 *   <li>{@link #DIRECTOR} — 임원. 모든 부서 데이터 열람, 시스템 조작 불가. department = {@code ALL}.</li>
 *   <li>{@link #MANAGER}  — 부서 관리자. 부서 값 필수.</li>
 *   <li>{@link #STAFF}    — 실무자. 부서 값 필수.</li>
 * </ul>
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
