package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.service.CataractStatsSystemService;
import com.bviit.analytics.reservation.service.ReservationStatsSystemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * 예약통계(시력교정·백내장) 일별 마트 적재 잡.
 *
 * 배치 정책: 매일 D-1 하루만 MSSQL 원본에서 조회해 Postgres 마트에 upsert
 * (소급 변동 감수). 확정(잠금)된 월(reservation_stats_period_lock)의 일자는 스킵.
 *
 * 읽기 경로:
 *   - ReservationStatsSystemService.getDailyCounts(from, to) — 시력교정 CH01~CH24
 *   - CataractStatsSystemService.getDailyCounts(from, to)    — 백내장 원시 카운트
 *
 * 쓰기 경로:
 *   - mart_reservation_stats_system_daily   (upsert)
 *   - mart_reservation_stats_cataract_daily (upsert)
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationStatsDailyMartJob {

    static final String MART_NAME = "reservation_stats_daily";

    private static final String PRODUCT_SYSTEM = "SYSTEM";
    private static final String PRODUCT_CATARACT = "CATARACT";

    private final ReservationStatsSystemService systemService;
    private final CataractStatsSystemService cataractService;
    private final ReservationStatsDailyMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    /**
     * from..to 범위의 각 일자를 MSSQL 원본에서 조회해 Postgres 마트에 upsert.
     * 잠긴 월(period)의 일자는 스킵. 정책상 daily 호출은 from=to=D-1.
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. system/cataract/watermark 중 하나라도 실패하면
     * 모두 롤백. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public int run(LocalDate from, LocalDate to) {
        log.info("ReservationStatsDailyMartJob start: range={}..{}", from, to);

        // 1) MSSQL 원본 조회 (시력교정 + 백내장)
        List<ReservationStatsDailyRow> systemRows =
                systemService.getDailyCounts(from.toString(), to.toString());
        List<CataractStatsDailyRow> cataractRows =
                cataractService.getDailyCounts(from.toString(), to.toString());

        // 2) 잠긴 월 필터링 — 확정된 월의 데이터는 덮어쓰지 않음
        Set<String> lockedSystem = writer.findLockedPeriods(PRODUCT_SYSTEM);
        Set<String> lockedCataract = writer.findLockedPeriods(PRODUCT_CATARACT);

        List<ReservationStatsDailyRow> filteredSystem = systemRows.stream()
                .filter(r -> !lockedSystem.contains(ReservationStatsDailyMartWriter.periodOf(r.date())))
                .toList();
        List<CataractStatsDailyRow> filteredCataract = cataractRows.stream()
                .filter(r -> !lockedCataract.contains(ReservationStatsDailyMartWriter.periodOf(r.date())))
                .toList();

        int skippedSystem = systemRows.size() - filteredSystem.size();
        int skippedCataract = cataractRows.size() - filteredCataract.size();
        if (skippedSystem > 0 || skippedCataract > 0) {
            log.info("ReservationStatsDailyMartJob locked-skip: system={} cataract={}",
                    skippedSystem, skippedCataract);
        }

        // 3) Upsert
        int systemUpserted = writer.upsertSystemDaily(filteredSystem);
        int cataractUpserted = writer.upsertCataractDaily(filteredCataract);

        // 4) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        int total = systemUpserted + cataractUpserted;
        log.info("ReservationStatsDailyMartJob done: system={} cataract={} total={}",
                systemUpserted, cataractUpserted, total);
        return total;
    }
}
