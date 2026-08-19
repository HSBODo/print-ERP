package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.ConsultationRateItem;

import java.util.List;

/**
 * 전환율 월별 조회 계약.
 *
 * 구현체:
 *   - ConsultationRateService          : @Profile("postgres-mart") — 배치 소스·대사(reconcile) 전용
 *   - ConsultationRateMartQueryService : @Profile("postgres-mart") @Primary — Postgres 마트
 *
 * Controllers는 이 인터페이스만 의존해 프로파일별 자동 스위치.
 * 배치는 ConsultationRateService 콘크리트 클래스를 주입해 MSSQL 소스에 붙는다.
 */
public interface ConsultationRateReader {
    List<ConsultationRateItem> getMonthlyRates(List<Integer> years);
}
