package com.bviit.analytics.surgery.service;

import java.util.List;
import java.util.Map;

/**
 * 수술자 리스트 조회 계약.
 *
 * 구현체:
 *   - SurgeryListService          : @Profile("mssql")     — MSSQL 직결 (레거시)
 *   - SurgeryListMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 */
public interface SurgeryListReader {
    List<Map<String, Object>> getSurgeryList(String from, String to);
}
