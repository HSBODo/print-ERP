package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;

import java.util.List;

/**
 * 검사자 종합표 월간 조회 계약.
 *
 * 구현체:
 *   - OverallExamMonthlyService          : @Profile("postgres-mart") — 주별을 월로 롤업
 *   - OverallExamMonthlyMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트 직접 조회
 */
public interface OverallExamMonthlyReader {
    List<OverallExamMonthlyItem> getMonthlyStats(List<Integer> years);
}
