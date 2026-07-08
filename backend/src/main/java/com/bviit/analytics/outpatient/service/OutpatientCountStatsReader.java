package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;

import java.util.List;

/**
 * 외래수 월별 조회 계약.
 *
 * 구현체:
 *   - OutpatientCountStatsService      : 항상 활성. MSSQL 라이브값(2026+). Repository 부재 시 null.
 *                                        배치 잡의 소스 리더로만 사용됨.
 *   - OutpatientCountMartQueryService  : @Profile("postgres-mart") @Primary — Postgres 마트 (실서비스 경로)
 */
public interface OutpatientCountStatsReader {
    List<OutpatientCountMonthlyItem> getMonthlyStats(List<Integer> years);
}
