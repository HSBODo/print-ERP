package com.bviit.analytics.reservation.dto;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트_홈페이지 조회 결과.
 *
 * <p>rows 의 키는 SQL 의 camelCase 별칭이 그대로 올라온 것이다(형제 리스트 API 와 동일한 계약).
 * 프론트 zod 스키마(api/reservation/reservationListHomepage.ts)와 1:1 로 맞춰야 한다.
 *
 * @param rows        목록. 등록일 기준, PK 역순.
 * @param lastRegDate 소스가 담고 있는 마지막 등록일시. 의미는 {@code live} 에 따라 갈린다.
 * @param live        실시간 소스(운영 DB 직결)인가. false 면 스냅샷 파일이다.
 *                    <p>스냅샷이면 {@code lastRegDate} 가 '천장'이라 그 이후 구간이 조용히 비어 나오므로
 *                    화면이 조회 종료일과 비교해 경고를 띄운다. 실시간이면 천장이 아니라 그냥 최근 등록건
 *                    시각이라, 같은 비교를 하면 미래 날짜 조회 시 <b>거짓 경고</b>가 된다
 *                    ("집계되지 않았습니다"). 그래서 화면이 이 값으로 배너를 끄고 신선도만 표시한다.
 */
public record ReservationListHomepageResult(
        List<Map<String, Object>> rows,
        String lastRegDate,
        boolean live
) {
}
