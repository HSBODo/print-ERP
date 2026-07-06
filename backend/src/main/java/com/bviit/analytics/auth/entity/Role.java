package com.bviit.analytics.auth.entity;

/**
 * 사용자 권한. Spring Security 규약을 따라 ROLE_ 접두사를 붙인 authority 로 매핑된다
 * (예: ADMIN → ROLE_ADMIN). {@link #authority()} 참고.
 */
public enum Role {
    ADMIN,
    USER;

    public String authority() {
        return "ROLE_" + name();
    }
}
