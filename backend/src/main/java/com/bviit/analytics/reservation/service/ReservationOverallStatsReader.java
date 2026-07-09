package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;

import java.util.List;

/**
 * 예약 종합(콜, 온라인) 월별 통계 조회 계약.
 *
 * 구현체:
 *   - ReservationOverallStatsService       : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (배치 소스)
 *   - ReservationOverallMartQueryService   : @Profile("postgres-mart") @Primary — Postgres 마트
 *
 * 컨트롤러는 이 인터페이스만 의존해 프로파일별 자동 스위치.
 * 배치는 여전히 ReservationOverallStatsService 콘크리트 클래스를 주입해 MSSQL 소스에 붙는다.
 */
public interface ReservationOverallStatsReader {
    List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years);
}
