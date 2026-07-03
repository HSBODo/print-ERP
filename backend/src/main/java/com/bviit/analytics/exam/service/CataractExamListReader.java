package com.bviit.analytics.exam.service;

import java.util.List;
import java.util.Map;

/**
 * 백내장 검사자 리스트 조회 계약.
 *
 * 구현체:
 *   - CataractExamListService          : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시)
 *   - CataractExamListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface CataractExamListReader {
    List<Map<String, Object>> getCataractExamList(String from, String to);
}
