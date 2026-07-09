package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationOverallMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 예약 종합(콜, 온라인) 월별 통계 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 ReservationOverallStatsReader 를 주입하면
 * MSSQL 버전(ReservationOverallStatsService)보다 이 구현체가 우선 선택된다.
 *
 * 응답 shape 은 ReservationOverallStatsService.getMonthlyStats 와 동일.
 * 24·25 는 V12 seed 값, 26~ 는 배치가 upsert 한 값.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationOverallMartQueryService implements ReservationOverallStatsReader {

    private final ReservationOverallMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years) {
        return martRepository.findMonthly(years);
    }
}
