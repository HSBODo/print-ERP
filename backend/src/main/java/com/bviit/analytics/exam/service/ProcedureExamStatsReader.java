package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;

import java.util.List;

/**
 * 검사수(EXAM 행 + Cataract_Exam 세션) 월별 조회 계약.
 *
 * 구현체:
 *   - ProcedureExamStatsService      : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - ProcedureExamMartQueryService  : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface ProcedureExamStatsReader {
    List<ProcedureExamMonthlyItem> getMonthlyStats(List<Integer> years);
}
