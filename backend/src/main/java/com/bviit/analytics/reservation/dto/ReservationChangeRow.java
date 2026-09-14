package com.bviit.analytics.reservation.dto;

/**
 * 예약 변경이력 마트(list_reservation_change) 1행 — 예약일이 1회 이상 바뀐 검사예약 1건.
 *
 * <ul>
 *   <li>registeredAt/Time : 등록일·시각. regSource 가 N(채번일)이면 시각은 빈 문자열.</li>
 *   <li>regSource         : H 변경이력 첫 저장 · I 등록시각(InsertedDateTime) · N 예약번호 채번일</li>
 *   <li>changeChain       : "YYYY-MM-DD HH:MM@YYYY-MM-DD|…" — 최초 예약일부터 순서대로. 시각 미상은 "@날짜".</li>
 *   <li>changeCount       : 체인 길이 - 1 (항상 1 이상 — 0이면 마트에 싣지 않는다)</li>
 * </ul>
 */
public record ReservationChangeRow(
        String reserveNum,
        String registeredAt,
        String registeredTime,
        String regSource,
        String chartNo,
        String name,
        String branch,
        String reserveState,
        String firstDate,
        String finalDate,
        int changeCount,
        String changeChain,
        String lastChangedAt
) {
}
