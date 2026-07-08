package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.stats.SnapshotWindow;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.repository.CataractStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 예약통계_백내장 — 라이브 일자별 카운트 조회 + 월별 확정/증분 스냅샷 저장.
 * 시력교정(ReservationStatsSystemService)과 동일 패턴. 백내장=RESERVE_FLAG='H'.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class CataractStatsSystemService {

    private final CataractStatsSystemRepository repository;
    private final CataractStatsSnapshotStore snapshotStore;
    private final ReservationStatsPeriodLock periodLock;

    @Transactional(readOnly = true)
    public List<CataractStatsDailyRow> getDailyCounts(String from, String to) {
        return repository.findDailyCounts(from, to);
    }

    /** 해당 월(period=YYYY-MM) 전체를 1회 조회해 JSON 스냅샷으로 확정 저장(월 전체 덮어쓰기). */
    @Transactional(readOnly = true)
    public CataractStatsSnapshot saveSnapshot(String period, String by) {
        Optional<LocalDate> end = SnapshotWindow.completedEnd(period, LocalDate.now());
        if (end.isEmpty()) {
            // 오늘이 1일이면 마감된 날(전일)이 이 달에 없음 → 저장 생략(오늘 데이터는 내일 반영).
            return snapshotStore.find(period).orElseGet(() -> emptySnapshot(period, by));
        }

        List<CataractStatsDailyRow> days = repository.findDailyCounts(period + "-01", end.get().toString());
        return periodLock.withPeriodLock(period, () -> {
            CataractStatsSnapshot snapshot =
                    new CataractStatsSnapshot(period, LocalDateTime.now().toString(), by, false, days);
            snapshotStore.save(snapshot);
            return snapshot;
        });
    }

    /**
     * 호출(증분 채움) — 해당 월을 D-1까지 조회해 기존 스냅샷에 <b>비어있는 날짜만</b> 추가한다.
     * 이미 있는 날짜(PDF 시드·이전 호출분)는 보존(덮어쓰기 금지).
     */
    @Transactional(readOnly = true)
    public CataractStatsSnapshot fillSnapshot(String period, String by) {
        Optional<LocalDate> end = SnapshotWindow.completedEnd(period, LocalDate.now());
        if (end.isEmpty()) {
            // 오늘이 1일이면 마감된 날(전일)이 이 달에 없음 → 채움 생략(기존 유지, 오늘 데이터는 내일 반영).
            return snapshotStore.find(period).orElseGet(() -> emptySnapshot(period, by));
        }

        // 라이브 조회는 무거울 수 있으므로 period lock 밖에서 끝내고, 파일 read/merge/save만 잠근다.
        List<CataractStatsDailyRow> fetched = repository.findDailyCounts(period + "-01", end.get().toString());
        return periodLock.withPeriodLock(period, () -> {
            Optional<CataractStatsSnapshot> existing = snapshotStore.find(period);
            List<CataractStatsDailyRow> merged = snapshotStore.mergeDays(existing, fetched);
            boolean locked = existing.map(CataractStatsSnapshot::locked).orElse(false);
            String confirmedBy = existing.map(CataractStatsSnapshot::confirmedBy).orElse(by);
            CataractStatsSnapshot snapshot =
                    new CataractStatsSnapshot(period, LocalDateTime.now().toString(), confirmedBy, locked, merged);
            snapshotStore.save(snapshot);
            return snapshot;
        });
    }

    /** 적재할 완료일이 없을 때(월초) 저장 없이 돌려주는 빈 스냅샷. */
    private static CataractStatsSnapshot emptySnapshot(String period, String by) {
        return new CataractStatsSnapshot(period, LocalDateTime.now().toString(), by, false, List.of());
    }
}
