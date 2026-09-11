package com.bviit.analytics.auth.entity;

/**
 * 사용자 소속 부서. 페이지·API 접근 스코프의 명사 축 (docs/auth/permissions.md § 2-2).
 *
 * <p>ADMIN·DIRECTOR 는 {@link #ALL} 로 저장돼 부서 gate 를 통과한다. MANAGER·STAFF 는
 * {@link #MEDICAL}·{@link #MARKETING}·{@link #OVERSEAS_MARKETING} 중 하나를 가진다.
 * 조합 제약은 DB CHECK {@code users_role_department_scope_ck} 로 강제
 * (개발 DB 는 수동 SQL 로 부여 · docs/auth/permissions.md § 5-1 하단).
 *
 * <p><b>주의</b> — 이 축은 "부서(department)" 다. 향후 소속(회사·법인) 축이 별도로 추가될 수 있어
 * 개념을 분리해 둔다.
 */
public enum Department {
    /** ADMIN·DIRECTOR 전용 — 두 그룹 전부 접근. MANAGER·STAFF 에는 부여 금지. */
    ALL,
    /** 메디컬 (진료·수술) 부서 — 예약·검사·수술·전환·외래·리포트·기타·관리자. 원장·실장·상담사·간호사. */
    MEDICAL,
    /** 마케팅 부서 — channel-profit·overseas·marketing·sms. 마케팅 팀장·실무자. */
    MARKETING,
    /**
     * 해외마케팅 전담 부서 (2026-09-11 신설) — 홈 + 해외마케팅 3종(접수리스트·통계·예약통계) 만 접근.
     * MARKETING 보다 좁은 스코프. 해외 접수 담당 실무자 전용.
     */
    OVERSEAS_MARKETING;
}
