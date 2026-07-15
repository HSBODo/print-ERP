package com.bviit.analytics.reservation.dto;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트_홈페이지 조회 결과.
 *
 * <p>rows 의 키는 SQL 의 camelCase 별칭이 그대로 올라온 것이다(형제 리스트 API 와 동일한 계약).
 * 프론트 zod 스키마(api/reservation/reservationListHomepage.ts)와 1:1 로 맞춰야 한다.
 *
 * @param rows               목록. 등록일 기준, PK 역순.
 * @param snapshotMaxRegDate 소스가 담고 있는 마지막 등록일시. 소스가 스냅샷이면 이 시점 이후
 *                           구간은 조용히 비어 나오므로, 화면이 조회 종료일과 비교해 경고한다.
 */
public record ReservationListHomepageResult(
        List<Map<String, Object>> rows,
        String snapshotMaxRegDate
) {
}
