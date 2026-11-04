package com.example.app.auth.entity;

/**
 * 사용자 소속 부서. 페이지·API 접근 범위를 나누는 두 번째 축(롤 × 부서).
 *
 * <p>ADMIN·DIRECTOR 는 {@link #ALL} 로 저장돼 부서 gate 를 항상 통과한다.
 * MANAGER·STAFF 는 {@link #ALL} 이 아닌 부서 중 하나를 가진다 ({@link User#isValidCombination}).
 *
 * <p>TEAM_A·TEAM_B 는 예시 값이다 — 프로젝트에 맞게 이름을 바꾸거나 추가할 것.
 * 바꿀 때 함께 고칠 곳: 프론트 {@code domain/support/session/session.ts} (UserDepartment) ·
 * {@code domain/core/auth/type/api.ts} · {@code domain/core/account} · Topbar 라벨.
 */
public enum Department {
    /** ADMIN·DIRECTOR 전용 — 모든 부서 gate 통과. MANAGER·STAFF 에는 부여 금지. */
    ALL,
    /** 예시 부서 A */
    TEAM_A,
    /** 예시 부서 B */
    TEAM_B;
}
