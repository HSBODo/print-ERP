package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.common.stats.MonthlySnapshotStore;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgerySnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 수술별 비중 일별 조회 파사드 — 스냅샷 우선 + 조회=호출(증분 채움) 통합.
 *
 *   - 조회 시 당월·미적재면 전일(D-1)까지 1회 증분 채움(있는 날짜는 보존) 후 스냅샷을 읽는다.
 *   - 이미 적재된 일자는 동결(보존)이라 과거 데이터가 흔들리지 않는다(예약통계시스템과 동일 규약).
 *   - 적재된 스냅샷이 있으면 DB 미연결(dev)에서도 조회 가능. 없고 라이브도 없으면 503.
 *
 * 라이브 조회/적재는 mssql 프로파일(SurgeryStatsService)에서만. 스냅샷 파일 읽기는 프로파일 무관.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SurgeryCompositionQueryService {

    private static final String FORMULA_VERSION = "surgery-composition-daily-v1";

    private final SurgerySnapshotStore snapshotStore;
    private final Optional<SurgeryStatsService> liveService;

    public record DailyResult(List<SurgeryDailyItem> data, StatsResponseMeta meta) {}

    public DailyResult getDaily(LocalDate from, LocalDate to, String username) {
        YearMonth firstMonth = YearMonth.from(from);
        YearMonth lastMonth = YearMonth.from(to);
        return firstMonth.equals(lastMonth)
                ? getMonth(firstMonth, from, to, username)
                : getMultiMonth(firstMonth, lastMonth, from, to, username);
    }

    /**
     * 여러 달에 걸친 범위(주차 뷰의 연간 조회 등) — 스냅샷이 월 단위라 달별로 조회해 이어 붙인다.
     * 한 달이 실패해도(미적재 + 라이브 미연결) 그 달만 비우고 나머지는 그대로 보여준다.
     */
    private DailyResult getMultiMonth(
            YearMonth firstMonth,
            YearMonth lastMonth,
            LocalDate from,
            LocalDate to,
            String username
    ) {
        YearMonth currentMonth = YearMonth.from(LocalDate.now());
        List<SurgeryDailyItem> data = new ArrayList<>();
        StatsResponseMeta meta = null;

        for (YearMonth month = firstMonth; !month.isAfter(lastMonth); month = month.plusMonths(1)) {
            if (month.isAfter(currentMonth)) break; // 미래월 — 조회/적재 대상 없음
            LocalDate monthFrom = from.isAfter(month.atDay(1)) ? from : month.atDay(1);
            LocalDate monthTo = to.isBefore(month.atEndOfMonth()) ? to : month.atEndOfMonth();
            try {
                DailyResult result = getMonth(month, monthFrom, monthTo, username);
                data.addAll(result.data());
                // 표시용 meta 는 데이터가 있는 마지막 달 기준(적재 여부·최종 적재일 배지).
                if (meta == null || !result.data().isEmpty()) meta = result.meta();
            } catch (RuntimeException e) {
                log.warn("범위 조회 중 월 조회 실패(해당 월만 공백): period={}, err={}", month, e.getMessage());
            }
        }

        StatsResponseMeta fallback = StatsResponseMeta.live(
                firstMonth.toString(), FORMULA_VERSION, SurgerySnapshot.CURRENT_SCHEMA_VERSION);
        return new DailyResult(data, meta != null ? meta : fallback);
    }

    private DailyResult getMonth(YearMonth month, LocalDate from, LocalDate to, String username) {
        String period = month.toString();
        ensureSnapshot(period, username);

        Optional<SurgerySnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            List<SurgeryDailyItem> days = filterDays(snapshot.get().days(), from, to);
            return new DailyResult(days, snapshotMeta(period, snapshot.get()));
        }

        // 당월인데 스냅샷이 없음(월초라 마감된 날 D-1이 아직 없음) → 오늘을 라이브로 노출하지 않고 빈 결과.
        if (isCurrentMonth(period)) {
            return new DailyResult(List.of(), StatsResponseMeta.live(period, FORMULA_VERSION, SurgerySnapshot.CURRENT_SCHEMA_VERSION));
        }

        // 적재가 아직 없는 지난달(데이터 0 등 예외적 경우) — 라이브로 직접 조회.
        return new DailyResult(
                requireLive(period).getDailyStats(from.toString(), to.toString()),
                StatsResponseMeta.live(period, FORMULA_VERSION, SurgerySnapshot.CURRENT_SCHEMA_VERSION)
        );
    }

    private static boolean isCurrentMonth(String period) {
        return period.equals(LocalDate.now().toString().substring(0, 7));
    }

    public SurgerySnapshot fill(String period, String username) {
        return requireLive(period).fillSnapshot(period, actor(username));
    }

    public SurgerySnapshot save(String period, String username) {
        return requireLive(period).saveSnapshot(period, actor(username));
    }

    public List<MonthlySnapshotStore.SnapshotInfo> listSnapshots() {
        return snapshotStore.listSnapshots();
    }

    /**
     * 조회 시 자동 적재(실패해도 기존 데이터로 계속):
     *   - 당월: 미잠금·오늘 미적재면 전일(D-1)까지 증분 채움(있는 날짜 보존).
     *   - 지난 달(미적재): 월 전체를 1회 적재해 동결(이후 조회는 스냅샷).
     *   - 지난 달(적재 있으나 말일 누락): 다음달 1일+ 첫 조회 시 1회 최종 채움(말일 데이터 반영).
     *   - 미래월: 아무것도 하지 않음.
     */
    private void ensureSnapshot(String period, String username) {
        if (liveService.isEmpty()) return;
        String thisMonth = LocalDate.now().toString().substring(0, 7);
        if (period.compareTo(thisMonth) > 0) return; // 미래월

        Optional<SurgerySnapshot> snapshot = snapshotStore.find(period);
        boolean isCurrent = period.equals(thisMonth);
        try {
            if (isCurrent) {
                if (needsCurrentFill(snapshot)) liveService.get().fillSnapshot(period, actor(username));
            } else if (snapshot.isEmpty()) {
                liveService.get().saveSnapshot(period, actor(username));
            } else if (needsPastFinalize(period, snapshot.get())) {
                liveService.get().fillSnapshot(period, actor(username));
            }
        } catch (RuntimeException e) {
            log.warn("조회 중 자동 적재 실패(기존 데이터로 계속): period={}, err={}", period, e.getMessage());
        }
    }

    /** 당월 증분이 필요한가 — 미적재(true)거나, 잠금 아님 + 오늘 아직 적재 안 했을 때. */
    private boolean needsCurrentFill(Optional<SurgerySnapshot> snapshot) {
        if (snapshot.isEmpty()) return true;
        if (snapshot.get().locked()) return false;
        return confirmedDate(snapshot.get().confirmedAt()).compareTo(LocalDate.now().toString()) < 0;
    }

    /**
     * 지난달 최종화가 필요한가 — 미잠금이고 마지막 적재일이 그 달 말일 이하일 때.
     * (말일에 적재해도 그날은 D-1까지만 잡혀 말일이 비므로, 다음날 최종 채움 필요.)
     */
    private boolean needsPastFinalize(String period, SurgerySnapshot snapshot) {
        if (snapshot.locked()) return false;
        String monthEnd = YearMonth.parse(period).atEndOfMonth().toString();
        return confirmedDate(snapshot.confirmedAt()).compareTo(monthEnd) <= 0;
    }

    private static String confirmedDate(String confirmedAt) {
        return confirmedAt != null && confirmedAt.length() >= 10 ? confirmedAt.substring(0, 10) : "";
    }

    private static List<SurgeryDailyItem> filterDays(List<SurgeryDailyItem> days, LocalDate from, LocalDate to) {
        String fromText = from.toString();
        String toText = to.toString();
        return days.stream()
                .filter(d -> d.getDate().compareTo(fromText) >= 0 && d.getDate().compareTo(toText) <= 0)
                .toList();
    }

    private SurgeryStatsService requireLive(String period) {
        return liveService.orElseThrow(() -> new DataSourceUnavailableException(
                "실 데이터 소스(MSSQL)가 연결되지 않았습니다.",
                StatsResponseMeta.unavailable(period, FORMULA_VERSION, SurgerySnapshot.CURRENT_SCHEMA_VERSION)
        ));
    }

    private static StatsResponseMeta snapshotMeta(String period, SurgerySnapshot snapshot) {
        return StatsResponseMeta.snapshot(
                period,
                FORMULA_VERSION,
                snapshot.locked(),
                snapshot.confirmedAt(),
                snapshot.confirmedBy(),
                snapshot.schemaVersion()
        );
    }

    private static String actor(String username) {
        return username == null || username.isBlank() ? "auto" : username;
    }
}
