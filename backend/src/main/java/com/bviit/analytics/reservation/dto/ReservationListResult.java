package com.bviit.analytics.reservation.dto;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트 응답 — 검사예약 명단 행.
 *
 *   - rows: RESERVATION 기반 검사예약 행(예약 종합의 콜+online과 동일 정의·동일 junk 제외).
 * 명단 행 합계 = 예약 종합 월 값(둘 다 카카오 미포함).
 */
public record ReservationListResult(List<Map<String, Object>> rows) {
}
