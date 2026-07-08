package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 수술 통계 월별 조회 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 SurgeryStatsReader를 주입할 때
 * MSSQL 버전보다 이 구현체가 우선 선택된다.
 *
 * 응답 shape은 SurgeryStatsService.getMonthlyStats와 완전히 동일해야 함
 * (SurgeryReconcileService가 두 소스 값 일치를 이미 검증).
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class SurgeryMartQueryService implements SurgeryStatsReader {

    private final SurgeryStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SurgeryMonthlyItem> getMonthlyStats(List<Integer> years) {
        return martRepository.findMonthly(years);
    }
}
