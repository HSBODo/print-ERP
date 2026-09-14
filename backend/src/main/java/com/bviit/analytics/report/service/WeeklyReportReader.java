package com.bviit.analytics.report.service;

import com.bviit.analytics.report.dto.WeeklyReportItem;

import java.util.List;

/**
 * 주차 레포트 조회 계약.
 *
 * 구현체 (postgres-mart 프로파일 · 컨트롤러가 이 인터페이스로 주입받으면 @Primary 인 마트 구현이 이긴다):
 *   - {@link WeeklyReportMartQueryService} : @Primary — Postgres 마트({@code mart_weekly_report}) 조회.
 *                                            화면 진입점. MSSQL 미접근.
 *   - {@link WeeklyReportService}          : @Service — MSSQL 직결(브릿지 포함). 배치 잡
 *                                            {@code ReportMartJob} 이 {@code mart_weekly_report} 를
 *                                            적재하기 위해 직접 클래스 이름으로 주입해 호출.
 *
 * 즉 배치 시점에만 MSSQL 이 조회되고, 사용자 화면 조회는 마트만 읽는다.
 */
public interface WeeklyReportReader {
    List<WeeklyReportItem> getWeeklyStats(List<Integer> years);
}
