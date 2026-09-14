package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

/**
 * 예약통계_시력교정 진단. diff/drillDown/parity 를 Postgres 마트(오버레이 포함) vs MSSQL 라이브로 비교한다.
 * 이관 이전 JSON 스냅샷 파일 대신 mart 데이터를 "확정본" 축으로 사용.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsDiagnosticDiffService {

    private final ReservationStatsSystemRepository liveRepository;
    private final ReservationStatsSystemMartRepository martRepository;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        return ReservationStatsDiagnosticSupport.diff(
                period,
                () -> loadMartRows(period),
                liveRepository::findDailyCounts,
                ReservationStatsDailyRow::date,
                ReservationStatsFieldRegistry.SYSTEM_FIELDS
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return ReservationStatsDiagnosticSupport.drillDown(
                period,
                date,
                field,
                () -> loadMartRows(period),
                ReservationStatsDailyRow::date,
                ReservationStatsFieldRegistry.SYSTEM_FIELDS,
                liveRepository::findDrillDownRows
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsParityResponse parity(String period, String field) {
        return ReservationStatsDiagnosticSupport.parity(
                period,
                field,
                liveRepository::findDailyCounts,
                ReservationStatsDailyRow::date,
                ReservationStatsFieldRegistry.SYSTEM_FIELDS,
                liveRepository::findDrillDownRows
        );
    }

    /**
     * 해당 월의 마트 데이터(override 오버레이 포함) 를 로드. 비어있으면 배치 미실행 상태로 간주해
     * DiagnosticSupport 가 "확정본 없음" 응답을 만들도록 Optional.empty() 반환.
     */
    private Optional<List<ReservationStatsDailyRow>> loadMartRows(String period) {
        YearMonth ym = YearMonth.parse(period);
        List<ReservationStatsDailyRow> rows = martRepository.findDailyCounts(
                ym.atDay(1).toString(),
                ym.atEndOfMonth().toString()
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows);
    }
}
