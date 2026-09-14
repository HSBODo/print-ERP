package com.bviit.analytics.exam.service;

import java.util.List;
import java.util.Map;

/**
 * 전체 검사자 리스트 조회 계약.
 *
 * 구현체:
 *   - AllExamListService          : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - AllExamListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface AllExamListReader {
    List<Map<String, Object>> getAllExamList(String from, String to);
}
