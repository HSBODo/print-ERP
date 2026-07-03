package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 예약 월별 통계 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 ReservationStatsReader를 주입하면
 * MSSQL 버전(ReservationStatsService)보다 이 구현체가 우선 선택된다.
 *
 * 응답 shape은 ReservationStatsService.getMonthlyStats와 동일해야 함
 * (ReservationReconcileService가 두 소스 값 일치를 검증).
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationMartQueryService implements ReservationStatsReader {

    private final ReservationStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReservationMonthlyItem> getMonthlyStats(List<Integer> years) {
        return martRepository.findMonthly(years);
    }
}
