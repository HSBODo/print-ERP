package com.bviit.analytics.surgery.service;

import java.util.List;
import java.util.Map;

/**
 * 재수술 후보 조회 계약.
 *
 * 구현체:
 *   - {@link ReoperationCandidateMartQueryService} : @Profile("postgres-mart") @Primary — list_reoperation 마트 조회
 *   - {@link ReoperationCandidateService}          : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 (레거시·reconcile)
 *
 * 컨트롤러는 이 인터페이스만 의존해 프로파일별 자동 스위치.
 */
public interface ReoperationCandidateReader {
    List<Map<String, Object>> getCandidates(String from, String to);
}
