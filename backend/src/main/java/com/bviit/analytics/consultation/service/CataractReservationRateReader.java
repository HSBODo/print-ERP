package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.CataractReservationRateItem;

import java.util.List;

/**
 * 예약률(vision/cataract) 월별 조회 계약.
 *
 * 구현체:
 *   - CataractReservationRateService          : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시, ExamRepository 재사용)
 *   - CataractReservationRateMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface CataractReservationRateReader {
    List<CataractReservationRateItem> getMonthlyRates(List<Integer> years, String category);
}
