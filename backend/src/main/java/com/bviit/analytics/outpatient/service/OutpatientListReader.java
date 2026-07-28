package com.bviit.analytics.outpatient.service;

import java.util.List;
import java.util.Map;

/**
 * 외래수 리스트 조회 계약.
 *
 * 구현체:
 *   - OutpatientListService : @Profile({"mssql","postgres-mart"}) — MSSQL 직결
 */
public interface OutpatientListReader {
    List<Map<String, Object>> getOutpatientList(String from, String to);
}
