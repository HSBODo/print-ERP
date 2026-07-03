package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;

import java.util.List;

/**
 * 예약 통계 월별 조회 계약.
 *
 * 구현체:
 *   - ReservationStatsService     : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시)
 *   - ReservationMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 *
 * Controllers는 이 인터페이스만 의존해 프로파일별 자동 스위치.
 * 배치는 여전히 ReservationStatsService 콘크리트 클래스를 주입해 MSSQL 소스에 붙는다.
 */
public interface ReservationStatsReader {
    List<ReservationMonthlyItem> getMonthlyStats(List<Integer> years);
}
