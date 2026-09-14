package com.bviit.analytics.reservation.dto;

import java.util.List;
import java.util.Map;

/**
 * 예약 변경이력 추이 달력 응답 — 일별 · 구분별 {day, branch, total, changed}.
 *
 * <ul>
 *   <li>byRegistered  : 등록일 기준 — 그 날 등록된 검사예약 수(total)와 그중 예약일이 바뀐 수(changed)</li>
 *   <li>byReserveDate : 예약일 기준 — 그 날로(최종 예약일) 잡혀 있는 예약 수와 그중 바뀐 수. 미래 달 포함.</li>
 * </ul>
 * 변경률 = changed / total 은 프런트가 낸다.
 */
public record ReservationChangeDailyResult(
        List<Map<String, Object>> byRegistered,
        List<Map<String, Object>> byReserveDate
) {
}
