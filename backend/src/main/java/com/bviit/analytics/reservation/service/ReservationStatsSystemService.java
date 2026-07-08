package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 예약통계시스템 — MSSQL BCRM RSS 일자별 원시 카운트 라이브 조회.
 *
 * 배치(ReservationStatsDailyMartJob) 가 매일 D-1 데이터를 Postgres 마트로 upsert 할 때만 사용된다.
 * 사용자 조회 경로는 QueryService → Mart Repository. 이 서비스는 배치 read 전용.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReservationStatsSystemService {

    private final ReservationStatsSystemRepository repository;

    @Transactional(readOnly = true)
    public List<ReservationStatsDailyRow> getDailyCounts(String from, String to) {
        return repository.findDailyCounts(from, to);
    }
}
