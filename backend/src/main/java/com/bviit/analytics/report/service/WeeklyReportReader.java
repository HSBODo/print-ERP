package com.bviit.analytics.report.service;

import com.bviit.analytics.report.dto.WeeklyReportItem;

import java.util.List;

/**
 * 주차 레포트 조회 계약.
 *
 * 구현체:
 *   - {@link WeeklyReportService} : @Profile("postgres-mart") — 운영 DB 일별 집계를 ISO 주차로 묶는다.
 *
 * 주차 값은 전 구간 라이브다(레거시 확정값은 월 단위라 주로 쪼갤 수 없음). 마트 전용 구현은 없다 —
 * 주차 마트가 생기면 여기 @Primary 구현을 추가하면 된다.
 */
public interface WeeklyReportReader {
    List<WeeklyReportItem> getWeeklyStats(List<Integer> years);
}
