package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;

import java.util.List;

/**
 * 검사수(EXAM 행 + Cataract_Exam 세션) 월별 조회 계약.
 *
 * 구현체:
 *   - ProcedureExamStatsService      : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시)
 *   - ProcedureExamMartQueryService  : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface ProcedureExamStatsReader {
    List<ProcedureExamMonthlyItem> getMonthlyStats(List<Integer> years);
}
