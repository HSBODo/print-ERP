package com.bviit.analytics.exam.service;

import java.util.List;
import java.util.Map;

/**
 * 전체 검사자 리스트 조회 계약.
 *
 * 구현체:
 *   - AllExamListService          : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시)
 *   - AllExamListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface AllExamListReader {
    List<Map<String, Object>> getAllExamList(String from, String to);
}
