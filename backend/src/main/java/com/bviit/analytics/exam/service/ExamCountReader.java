package com.bviit.analytics.exam.service;

import java.util.List;
import java.util.Map;

/**
 * 고객분류별 검사수(월간 레포트 도표 #7) 조회 계약.
 *
 * 구현체:
 *   - {@link ExamCountService}          : @Profile({"mssql","postgres-mart"}) — MSSQL 직결 집계(배치 적재용)
 *   - {@link ExamCountMartQueryService} : @Profile("postgres-mart") @Primary — 화면 조회용 마트 read
 *
 * 화면은 마트를 읽어 MSSQL(SSH 터널·VPN) 가용성과 무관하게 동작한다.
 */
public interface ExamCountReader {

    /** (월 × 내원동기(레포트)) 건수. 행 shape: {month:int, motiveReport:String, cnt:int} */
    List<Map<String, Object>> getExamCountByClassMonthly(String from, String to);
}
