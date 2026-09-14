package com.bviit.analytics.reservation.dto;

import java.util.List;
import java.util.Map;

/**
 * 예약 변경이력 응답 — 등록일 범위의 변경된 검사예약 행(camelCase 키).
 * 체인 해석(변경1~N · 기준일 시점 예약일)은 프런트가 changeChain 문자열로 한다.
 */
public record ReservationChangeResult(List<Map<String, Object>> rows) {
}
