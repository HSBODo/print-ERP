package com.bviit.analytics.etc.service;

import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;

import java.util.List;

/**
 * B2B 매출 월별 조회 계약.
 *
 * 구현체:
 *   - B2bRevenueStatsService          : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - B2bRevenueStatsMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface B2bRevenueStatsReader {
    List<B2bRevenueMonthlyItem> getMonthlyRevenue(List<Integer> years);
}
