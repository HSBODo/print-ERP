package com.bviit.analytics.reservation.dto;

/**
 * 예약통계시스템(시력교정) — 셀 수기 수정 1건의 이력(감사 로그 겸 화면 마커 근거).
 *
 * 홈페이지/네이버 온라인예약 원시 카운트가 이벤트 로그(RESERVATION 등록일) 기반이라
 * 후행 재수집 시점에 값이 어긋나는 경우가 있어, PDF/레거시 값으로 직접 고칠 수 있게 한다.
 * 어떤 필드를 어떤 값으로, 누가, 언제 고쳤는지를 기록한다.
 */
public record ReservationStatsCellEdit(
        String field,     // 수정된 필드명 (homeReceived | homeReservation | naverReceived | naverRejected | naverValid | naverReservation)
        int value,        // 적용된 값
        String editedBy,  // 수정한 사용자 로그인 ID
        String editedAt   // 수정 시각 ISO-8601
) {
}
