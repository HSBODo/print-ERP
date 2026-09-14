package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.service.ReoperationCandidateService;
import com.bviit.analytics.surgery.service.ReoperationOverlay;
import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
import com.bviit.analytics.surgery.service.SurgeryListService;
import com.bviit.analytics.surgery.service.SurgeryStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 수술 도메인 마트 적재 잡.
 *
 * 세 개의 마트를 채운다:
 *   - mart_surgery_monthly  — 대상 기간의 각 (yr, mo) upsert (min-year 가드로 백필값 write 차단)
 *   - mart_surgery_daily    — from..to 각 날짜 upsert
 *   - list_surgery          — from..to 범위 delete+insert
 *
 * MSSQL 소스에서 읽기는 기존 서비스(SurgeryStatsService, SurgeryListService) 재사용.
 * 월별은 LEGACY_VISION_SURGERY 보정치가 적용된 값으로 저장됨(현재 UI 값과 일치).
 *
 * 24·25 는 V-seed 가 없어 최초 1회 운영자가 admin API 로 백필해야 한다
 * (예: POST /api/admin/batch/rerun?from=2024-01-01&to=2025-12-31&domain=SURGERY,
 *  실행 전 batch.mart.min-year=2024 로 임시 낮춘 뒤 다시 2026 으로 복원).
 * 백필 이후에는 min-year 가드가 24·25 값을 daily 배치 재실행으로부터 보호한다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SurgeryMartJob {

    static final String MART_NAME = "surgery";

    /**
     * 이 날짜부터만 마트를 다시 쓴다. 그 앞 구간은 확정값(골든)이라 배치가 건드리지 않는다.
     *
     * 왜 필요한가 — 수술 집계 정의를 v_all_surgery_list 기준으로 바꾸면서,
     * 이미 보고에 나간 2026-01~05 값이 소급해 바뀌는 걸 막아야 했다.
     * (실측: 2026-02 시력교정이 리스트 1386 vs 월별 1388 로 2 차이, 2026-06 백내장이
     *  사람×날짜 62 vs 눈 65 로 3 차이. 새 정의로 다시 쓰면 앞 구간 숫자가 움직인다.)
     *
     * 보호 범위는 daily·monthly·list 셋 다다. monthly 만 막으면 주차 레포트·수술별 비중이
     * 읽는 daily 가 바뀌어 같은 화면 안에서 월↔주가 어긋난다.
     *
     * 확정값의 원천:
     *   2024·2025      → V15__surgery_monthly_seed.sql
     *   2026-01~05     → V35__surgery_monthly_2026_01_05_golden.sql
     *   (daily 는 24·25 도 시드가 없다 — 이 가드가 현재 적재분을 지키는 유일한 장치다)
     */
    static final LocalDate MART_LIVE_FROM = LocalDate.of(2026, 6, 1);

    private final SurgeryStatsService statsService;
    private final SurgeryListService listService;
    private final ReoperationCandidateService reopCandidateService;
    private final SurgeryStatsMartRepository martRepository;
    private final SurgeryMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * from..to 범위를 적재한다.
     *
     *   - Daily: 각 날짜 upsert
     *   - Monthly: 범위에 걸친 (yr,mo) 조합을 SurgeryStatsService.getMonthlyStats로 재계산 후 upsert
     *   - List: 범위 delete+insert
     *
     * 반환값은 upsert/insert된 총 행 수 (관측용).
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. daily/monthly/list/성공 로그 중 하나라도 실패하면
     * 모두 롤백되어 일관성을 보장한다. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        // 확정 구간(MART_LIVE_FROM 이전)은 요청 범위에서 잘라낸다. 통째로 확정 구간이면 아무것도 쓰지 않는다.
        // 잘라내지 않고 필터만 걸면 list 의 delete+insert 가 범위 전체를 지워버려 골든이 사라진다.
        LocalDate effectiveFrom = from.isBefore(MART_LIVE_FROM) ? MART_LIVE_FROM : from;
        if (to.isBefore(effectiveFrom)) {
            log.info("SurgeryMartJob skip: range={}..{} 는 전부 확정 구간({} 이전)", from, to, MART_LIVE_FROM);
            return Map.of("mart_surgery_daily", 0, "mart_surgery_monthly", 0, "list_surgery", 0);
        }
        if (!effectiveFrom.equals(from)) {
            log.info("SurgeryMartJob clamp: 요청 {}..{} → 적재 {}..{} (확정 구간 보호)", from, to, effectiveFrom, to);
        }
        log.info("SurgeryMartJob start: range={}..{}", effectiveFrom, to);

        // ── 순서 주의 ──
        // 집계(2·3)가 리스트(1)를 읽는 뷰에서 나오므로 **리스트를 먼저** 적재한다.
        // 순서를 뒤집으면 집계가 직전 배치분을 보고 계산해 하루씩 밀린다.

        // 1a) 수술자 리스트 delete+insert
        List<Map<String, Object>> listRows = listService.getSurgeryList(effectiveFrom.toString(), to.toString());
        int listRowsCount = writer.replaceList(effectiveFrom, to, listRows);

        // 1b) 재수술 리스트 delete+insert.
        //     렌즈/레이저는 여기서 자바로 판정해 넣는다 — SQL 로 옮기면 시술명 패턴이 두 벌이 된다
        //     (2026-08-06 KPL 누락이 정확히 그 유형의 사고였다).
        //     포함/제외 최종 판정은 넣지 않는다. 화면에서 고치면 즉시 반영돼야 해서 뷰가 조회 시점에 조인한다.
        List<Map<String, Object>> reopRows = reopCandidateService.getCandidates(
                effectiveFrom.toString(), to.toString());
        for (Map<String, Object> row : reopRows) {
            row.put("isLens", ReoperationOverlay.isLensCategory(
                    asText(row.get("againR")), asText(row.get("againL"))));
        }
        int reopRowsCount = writer.replaceReoperation(effectiveFrom, to, reopRows);

        // 2) 일별 집계 — 방금 적재한 리스트를 v_all_surgery_list 로 접는다(= 화면 리스트와 같은 정의).
        List<Map<String, Object>> dailyAgg =
                martRepository.findSurgeryDailyAgg(effectiveFrom.toString(), to.toString());
        List<SurgeryDailyItem> daily = dailyAgg.stream().map(SurgeryAggFolder::toDailyItem).toList();
        int dailyRows = writer.upsertDaily(daily);

        // 3) 월별 집계 — 걸쳐 있는 **달 전체**를 다시 읽어 접는다.
        //
        //    ⚠️ daily 를 그대로 접으면 안 된다. 이 잡은 하루짜리 범위로도 불린다
        //       (매일 03시 D-1 배치 · 재수술 판정 저장 후 ReoperationMartRefresher).
        //       그때 daily 는 그 하루뿐이라, 접으면 그 달 전체가 하루치 값으로 덮인다.
        //       2026-08-06 실제로 그렇게 만들었다가 7월 총 수술수가 861 → 34 로 무너졌다.
        //       월별은 언제나 "그 달 전체의 합"이어야 하므로 범위를 달 경계로 넓혀 다시 읽는다.
        //
        //    min-year 미만 연도는 백필된 값(24·25)을 보존하기 위해 write 차단.
        LocalDate monthFrom = maxDate(effectiveFrom.withDayOfMonth(1), MART_LIVE_FROM);
        LocalDate monthTo = to.withDayOfMonth(to.lengthOfMonth());
        List<SurgeryDailyItem> monthDaily =
                martRepository.findSurgeryDailyAgg(monthFrom.toString(), monthTo.toString())
                        .stream().map(SurgeryAggFolder::toDailyItem).toList();
        List<SurgeryMonthlyItem> monthly = SurgeryAggFolder.aggregateByMonth(monthDaily).stream()
                .filter(m -> m.getYear() >= minYear)
                .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), effectiveFrom, to))
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        // 4) 성공 로그 갱신 (성공 시에만)
        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "mart_surgery_daily", dailyRows,
                "mart_surgery_monthly", monthlyRows,
                "list_surgery", listRowsCount,
                "list_reoperation", reopRowsCount
        );
        log.info("SurgeryMartJob done: {}", stats);
        return stats;
    }

    /**
     * 재수술 리스트만 백필한다 — 확정 구간(MART_LIVE_FROM 이전)용.
     *
     * 왜 별도 메서드인가 — run() 은 확정 구간을 통째로 잘라내므로 골든을 지키는 대신
     * 그 구간의 **리스트도** 영영 비어 있게 된다. 실제로 2026-01~05 의 list_reoperation 이
     * 그렇게 비어 있었다(집계는 V35 골든에 이미 재수술 32/33/18/19/23 이 들어 있는데
     * 원본 행만 없는 상태 — 화면에서 근거를 못 펼친다).
     *
     * 이 메서드는 원본 행만 채운다:
     *   - list_reoperation  범위 delete+insert  ← 유일한 write
     *   - mart_surgery_daily / mart_surgery_monthly / list_surgery / 성공 로그  → 손대지 않음
     * 따라서 골든 집계는 그대로 유지된다("골든값은 사용한다" 원칙).
     *
     * ⚠️ v_all_surgery_list 는 list_reoperation 을 UNION 하므로, 백필하면 그 구간 뷰에
     *    재수술 행이 새로 보인다. 이건 집계와 리스트의 불일치를 **없애는** 방향이라 의도된 것이다.
     *    다만 이 구간에 대해 SURGERY/REPORT 배치를 다시 돌리면 안 된다 —
     *    run() 의 클램프가 SURGERY 는 막아 주지만, 레포트 마트는 별도 가드를 확인할 것.
     */
    @Transactional
    public int backfillReoperation(LocalDate from, LocalDate to) {
        List<Map<String, Object>> rows = reopCandidateService.getCandidates(from.toString(), to.toString());
        for (Map<String, Object> row : rows) {
            row.put("isLens", ReoperationOverlay.isLensCategory(
                    asText(row.get("againR")), asText(row.get("againL"))));
        }
        int inserted = writer.replaceReoperation(from, to, rows);
        log.info("SurgeryMartJob backfillReoperation: range={}..{} list_reoperation={} (집계 미변경)",
                from, to, inserted);
        return inserted;
    }

    /** candidates SQL 은 ISNULL 로 항상 문자열을 주지만, 마트 경유 시 null 방어를 한 번 더 둔다. */
    private static String asText(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    static LocalDate maxDate(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? b : a;
    }

    /** from..to에 걸친 연도 목록 (오름차순, 중복 제거). */
    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1).toList();
    }

    /** (year, month)가 [from, to] 구간과 겹치는지 판정. */
    private static boolean isMonthInRange(int year, int month, LocalDate from, LocalDate to) {
        YearMonth ym = YearMonth.of(year, month);
        YearMonth ymFrom = YearMonth.from(from);
        YearMonth ymTo = YearMonth.from(to);
        return !ym.isBefore(ymFrom) && !ym.isAfter(ymTo);
    }
}
