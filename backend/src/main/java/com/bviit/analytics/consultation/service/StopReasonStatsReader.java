package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;

import java.util.List;

/**
 * 검사 중단 사유 월별 조회 계약.
 *
 * 구현체:
 *   - StopReasonStatsService          : 항상 활성 (mssql 없으면 0-fill)
 *   - StopReasonStatsMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface StopReasonStatsReader {
    List<StopReasonMonthlyItem> getMonthlyStats(List<Integer> years);
}
