package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;

import java.util.List;

/**
 * 검사 월별 통계(시력교정/드림렌즈/백내장) 조회 계약.
 *
 * 구현체:
 *   - ExaminationStatsService      : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - ExaminationMartQueryService  : @Profile("postgres-mart") @Primary — Postgres 마트
 *
 * Controllers는 이 인터페이스만 의존해 프로파일별 자동 스위치.
 * 배치는 ExaminationStatsService 콘크리트 클래스를 주입해 MSSQL 소스에 붙는다.
 */
public interface ExaminationStatsReader {
    List<ExaminationMonthlyItem> getMonthlyStats(List<Integer> years);
}
