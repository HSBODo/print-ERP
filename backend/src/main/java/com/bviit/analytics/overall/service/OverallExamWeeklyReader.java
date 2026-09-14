package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;

import java.util.List;

/**
 * 검사자 종합표 주간 조회 계약.
 *
 * 구현체:
 *   - OverallExamWeeklyService          : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - OverallExamWeeklyMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface OverallExamWeeklyReader {
    List<OverallExamWeeklyItem> getWeeklyStats(List<Integer> years);
}
