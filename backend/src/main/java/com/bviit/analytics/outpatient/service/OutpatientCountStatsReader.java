package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;

import java.util.List;

/**
 * 외래수 월별 조회 계약.
 *
 * 구현체:
 *   - OutpatientCountStatsService      : 항상 활성 (mssql 없으면 2024·2025 레거시만, 2026+ null)
 *   - OutpatientCountMartQueryService  : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface OutpatientCountStatsReader {
    List<OutpatientCountMonthlyItem> getMonthlyStats(List<Integer> years);
}
