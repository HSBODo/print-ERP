package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.repository.ReservationStatsSystemMartRepository;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationStatsSystemQueryService {

    private static final String STATS_TYPE = "system";
    private static final String FORMULA_VERSION = "reservation-stats-system-v1";

    private final ReservationStatsSnapshotStore snapshotStore;
    private final ReservationStatsCellEditService cellEditService;
    private final Optional<ReservationStatsSystemService> liveService;
    private final Optional<ReservationStatsDiagnosticDiffService> diagnosticService;
    private final Optional<ReservationStatsSystemMartRepository> martRepository;
    private final Optional<ReservationStatsOverrideCellEditService> martCellEditService;

    public ReservationStatsResult<List<ReservationStatsDailyRow>> getDailyCounts(
            LocalDate from,
            LocalDate to,
            String username
    ) {
        String period = from.toString().substring(0, 7);

        // postgres-mart 프로파일: 배치가 채운 D-1 마트가 유일한 진실. override 는 SQL 에서 오버레이됨.
        if (martRepository.isPresent()) {
            List<ReservationStatsDailyRow> days = martRepository.get()
                    .findDailyCounts(from.toString(), to.toString());
            return new ReservationStatsResult<>(days, martMeta(period));
        }

        // 이하 레거시 경로 (mssql-only 프로파일). Cutover 후 제거 예정.
        autoFillIfNeeded(period, username);

        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            List<ReservationStatsDailyRow> days = ReservationStatsQuerySupport.filterDays(
                    snapshot.get().days(),
                    ReservationStatsDailyRow::date,
                    from,
                    to
            );
            return new ReservationStatsResult<>(days, snapshotMeta(period, snapshot.get()));
        }

        // 당월인데 스냅샷이 없음(월초라 마감된 날 D-1이 아직 없음) → 오늘을 라이브로 노출하지 않고 빈 결과.
        if (isCurrentMonth(period)) {
            return new ReservationStatsResult<>(List.of(), liveMeta(period));
        }

        ReservationStatsSystemService service = requireLiveService(period);
        return new ReservationStatsResult<>(
                service.getDailyCounts(from.toString(), to.toString()),
                liveMeta(period)
        );
    }

    private static boolean isCurrentMonth(String period) {
        return period.equals(LocalDate.now().toString().substring(0, 7));
    }

    public ReservationStatsDailyRow editCell(
            String period,
            String date,
            String field,
            int value,
            String username
    ) {
        String actor = ReservationStatsQuerySupport.actor(username);
        if (martCellEditService.isPresent()) {
            return martCellEditService.get().editCell(period, date, field, value, actor);
        }
        return cellEditService.editCell(period, date, field, value, actor);
    }

    public ReservationStatsDiffResponse diff(String period) {
        return requireDiagnosticService(period).diff(period);
    }

    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return requireDiagnosticService(period).drillDown(period, date, field);
    }

    public ReservationStatsParityResponse parity(String period, String field) {
        return requireDiagnosticService(period).parity(period, field);
    }

    public ReservationStatsDiagnosticsHealthResponse health(String period) {
        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        StatsResponseMeta.Source source = martRepository.isPresent()
                ? StatsResponseMeta.Source.MART
                : snapshot.isPresent()
                ? StatsResponseMeta.Source.SNAPSHOT
                : liveService.isPresent()
                ? StatsResponseMeta.Source.LIVE
                : StatsResponseMeta.Source.UNAVAILABLE;

        return new ReservationStatsDiagnosticsHealthResponse(
                period,
                STATS_TYPE,
                source,
                liveService.isPresent(),
                diagnosticService.isPresent(),
                snapshot.isPresent(),
                snapshot.map(ReservationStatsSnapshot::locked).orElse(false),
                snapshot.map(ReservationStatsSnapshot::schemaVersion)
                        .orElse(ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION),
                snapshot.map(s -> s.days().size()).orElse(0),
                snapshot.map(s -> ReservationStatsQuerySupport.latestDate(s.days(), ReservationStatsDailyRow::date))
                        .orElse(null),
                snapshot.map(ReservationStatsSnapshot::confirmedAt).orElse(null),
                snapshot.map(ReservationStatsSnapshot::confirmedBy).orElse(null),
                FORMULA_VERSION,
                LocalDateTime.now().toString()
        );
    }

    private void autoFillIfNeeded(String period, String username) {
        if (liveService.isEmpty()) return;

        Optional<ReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        boolean needsAutoFill = ReservationStatsQuerySupport.needsAutoFill(
                LocalDate.now(),
                period,
                snapshotStore.isLocked(period),
                snapshot,
                ReservationStatsSnapshot::confirmedAt
        );
        if (!needsAutoFill) return;

        try {
            liveService.get().fillSnapshot(period, username == null ? "auto" : username);
        } catch (RuntimeException e) {
            log.warn("조회 중 자동 채움 실패(기존 데이터로 계속): period={}, err={}", period, e.getMessage());
        }
    }

    private ReservationStatsSystemService requireLiveService(String period) {
        return liveService.orElseThrow(() -> dataSourceUnavailable(period));
    }

    private ReservationStatsDiagnosticDiffService requireDiagnosticService(String period) {
        return diagnosticService.orElseThrow(() -> dataSourceUnavailable(period));
    }

    private static StatsResponseMeta snapshotMeta(String period, ReservationStatsSnapshot snapshot) {
        return StatsResponseMeta.snapshot(
                period,
                FORMULA_VERSION,
                snapshot.locked(),
                snapshot.confirmedAt(),
                snapshot.confirmedBy(),
                snapshot.schemaVersion()
        );
    }

    private static StatsResponseMeta liveMeta(String period) {
        return StatsResponseMeta.live(
                period,
                FORMULA_VERSION,
                ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION
        );
    }

    private static StatsResponseMeta martMeta(String period) {
        return StatsResponseMeta.mart(
                period,
                FORMULA_VERSION,
                ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION
        );
    }

    private static DataSourceUnavailableException dataSourceUnavailable(String period) {
        return new DataSourceUnavailableException(
                "실 데이터 소스(MSSQL)가 연결되지 않았습니다.",
                StatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION
                )
        );
    }
}
