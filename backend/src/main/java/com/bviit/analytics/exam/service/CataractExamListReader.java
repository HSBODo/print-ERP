package com.bviit.analytics.exam.service;

import java.util.List;
import java.util.Map;

/**
 * 백내장 검사자 리스트 조회 계약.
 *
 * 구현체:
 *   - CataractExamListService          : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - CataractExamListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface CataractExamListReader {
    List<Map<String, Object>> getCataractExamList(String from, String to);
}
