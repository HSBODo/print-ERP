package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationListRepository;
import com.bviit.analytics.reservation.repository.ReservationStatsMartRepository;
import com.bviit.analytics.reservation.service.ReservationListService;
import com.bviit.analytics.reservation.service.ReservationOverallMartQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 예약 도메인 마트 적재 잡.
 *
 * 네 개의 마트를 채운다:
 *   - list_reservation_all               — from..to 예약일 범위 delete+insert (얇은 리스트)
 *   - mart_reservation_monthly           — (yr, mo) upsert. **위 리스트를 월로 접어** 만든다 (수술/외래/드림렌즈)
 *   - mart_reservation_overall_monthly   — (yr, mo) upsert (예약 종합/콜/온라인). min-year 가드로 24·25 write 차단.
 *   - list_reservation                   — from..to 등록일 범위 delete+insert (검사 예약자 명단)
 *
 * mart_reservation_monthly 는 종전에 MSSQL 쪽 별도 쿼리(ReservationStatsService.getMonthlyStats
 * → sql/reservation/monthly-by-type.sql)로 계산해 저장했다. 같은 정의를 리스트에 담아
 * 리스트→월별 재집계로 통일 — 외래수·중단사유와 같은 패턴.
 *
 * mart_reservation_overall_monthly 는 화면 서비스(ReservationOverallMartQueryService @Primary)와
 * 완전히 같은 계산식으로 채운다 — 시력교정·백내장 채널 마트 + 홈페이지 마트 SUM.
 * 종전엔 MSSQL 직결(ReservationOverallStatsService) 로 배치가 재계산했으나,
 * 화면·배치가 서로 다른 소스를 쓰면 어긋날 위험이 있어 하나로 통일.
 *
 * MSSQL 소스에서 읽기는 검사(M) 예약자 명단(ReservationListService)에만 남아 있다.
 *
 * MSSQL 직결 서비스(ReservationStatsService·ReservationOverallStatsService)는 배치에서 더 이상 안 쓰지만
 * ReservationReconcileService 의 대사(reconcile) 소스로 유지된다.
 *
 * reservation_overall 의 24·25 확정값은 V12 seed 가 mart 에 넣은 값을 유일 원천으로 유지하며,
 * runManual 로 24·25 범위를 실행해도 min-year 이상 연도만 write.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationMartJob {

    static final String MART_NAME = "reservation";

    private final ReservationOverallMartQueryService overallMartQueryService;
    private final ReservationListService listService;
    private final ReservationListRepository listRepository;
    private final ReservationStatsMartRepository reservationMartRepository;
    private final ReservationMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * from..to 범위를 적재한다.
     *
     *   - Monthly: 범위에 걸친 (yr,mo)만 재계산 후 upsert
     *   - List:    범위 delete+insert (등록일 기준)
     *
     * 반환값은 upsert/insert된 총 행 수 (관측용).
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. monthly/list/성공 로그 중 하나라도 실패하면
     * 모두 롤백되어 일관성을 보장한다. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReservationMartJob start: range={}..{}", from, to);

        // ── 순서 주의 ──────────────────────────────────────────────
        // list_reservation_all 을 **먼저** 적재한다. mart_reservation_monthly 가 그 리스트를
        // 읽어 월로 접기 때문이다. 종전에는 월별이 MSSQL 을 각자 조회했다 — 같은 지표가
        // 두 벌로 구현돼 정의가 바뀌면 어긋났다(검사 2026-08-05 원데이 3건과 같은 문제).
        // ──────────────────────────────────────────────────────────

        // 1) list_reservation_all delete+insert (예약일 기준)
        List<Map<String, Object>> listAllRows =
                listRepository.findReservationListAll(from.toString(), to.toString());
        int listAllInserted = writer.replaceListReservationAll(from, to, listAllRows);

        // 2) Monthly upsert — 방금 적재한 리스트를 월로 접는다(= 원본 정의와 동일 매핑).
        //    mart_reservation_monthly 는 골든시드 없음 — min-year/is2026H1Seeded 필터 없음.
        Map<YearMonth, ReservationAgg> byMonth = aggregateReservationByMonth(
                reservationMartRepository.findReservationDailyAgg(from.toString(), to.toString()));
        List<ReservationMonthlyItem> monthly = byMonth.entrySet().stream()
                .filter(e -> isMonthInRange(e.getKey().getYear(), e.getKey().getMonthValue(), from, to))
                .map(e -> {
                    ReservationAgg a = e.getValue();
                    return ReservationMonthlyItem.builder()
                            .year(e.getKey().getYear())
                            .month(e.getKey().getMonthValue())
                            .surgery(a.surgery)
                            .outpatient(a.outpatient)
                            .dreamlens(a.dreamlens)
                            .total(a.surgery + a.outpatient + a.dreamlens)
                            .build();
                })
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        // 3) Overall monthly upsert
        //    화면(ReservationOverallMartQueryService @Primary)이 쓰는 계산식과 동일한 값을 마트에 저장한다.
        //    → 시력교정·백내장 채널 마트 + 홈페이지 마트 SUM (컷오버 2026-06 이후) + 골든시드 통과.
        //    종전에는 MSSQL 직결(ReservationOverallStatsService) 로 배치가 재계산했으나
        //    화면·배치가 서로 다른 계산식을 두면 어긋날 위험이 있어 화면 서비스를 재사용한다.
        //    - min-year 미만 연도(24·25)는 V12 seed 값 보존 (write 차단)
        //    - 2026-01~05 는 V24 골든 시드 보존 (write 차단) — 담당자 확정값
        //
        //    범위 API 사용 이유 — daily 배치가 D-1 하루만 원해도 연도 전체(12개월)를 계산하면 11/12 가 버려진다.
        //    getMonthlyStatsInRange 는 range 안 월만 계산하고 라이브 합산 SQL 도 tight 하게 스캔한다.
        YearMonth fromMonth = YearMonth.from(from);
        YearMonth toMonth   = YearMonth.from(to);
        List<ReservationOverallMonthlyItem> overallMonthly =
                overallMartQueryService.getMonthlyStatsInRange(fromMonth, toMonth).stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> !isOverallSeededMonth(m.getYear(), m.getMonth()))
                        .toList();
        int overallRows = writer.upsertOverallMonthly(overallMonthly);

        // 4) 검사(M) 예약자 명단 리스트 delete+insert (예약자 리스트 화면용, 별도 리스트)
        List<Map<String, Object>> listRows =
                listService.getReservationList(from.toString(), to.toString()).rows();
        int listRowsCount = writer.replaceList(from, to, listRows);

        // 5) 성공 로그 갱신 (성공 시에만)
        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "list_reservation_all", listAllInserted,
                "mart_reservation_monthly", monthlyRows,
                "mart_reservation_overall_monthly", overallRows,
                "list_reservation", listRowsCount
        );
        log.info("ReservationMartJob done: {}", stats);
        return stats;
    }

    /** 일별 집계를 월로 접는다. 주차 레포트는 같은 행을 ISO 주차로 접는다(정의는 리스트 하나). */
    private static Map<YearMonth, ReservationAgg> aggregateReservationByMonth(List<Map<String, Object>> dailyRows) {
        Map<YearMonth, ReservationAgg> byMonth = new LinkedHashMap<>();
        for (Map<String, Object> row : dailyRows) {
            LocalDate day = ((java.sql.Date) row.get("d")).toLocalDate();
            ReservationAgg acc = byMonth.computeIfAbsent(YearMonth.from(day), k -> new ReservationAgg());
            acc.surgery    += intOf(row, "surgery");
            acc.outpatient += intOf(row, "outpatient");
            acc.dreamlens  += intOf(row, "dreamlens");
        }
        return byMonth;
    }

    private static int intOf(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    /** 월 단위 누적기 — 필드는 select-reservation-daily-agg.sql 의 컬럼과 1:1. */
    private static final class ReservationAgg {
        private int surgery, outpatient, dreamlens;
    }

    /** (year, month)가 [from, to] 구간과 겹치는지 판정. */
    private static boolean isMonthInRange(int year, int month, LocalDate from, LocalDate to) {
        YearMonth ym = YearMonth.of(year, month);
        YearMonth ymFrom = YearMonth.from(from);
        YearMonth ymTo = YearMonth.from(to);
        return !ym.isBefore(ymFrom) && !ym.isAfter(ymTo);
    }

    /**
     * mart_reservation_overall_monthly 의 골든 시드 구간 판정.
     *
     * <p>2026-01~05 는 V24 시드가 담당자 확정값을 못 박은 구간 — 배치가 재계산해 덮으면
     * 확정값을 잃는다. V22 백내장 검사수 골든과 동일 패턴.
     */
    private static boolean isOverallSeededMonth(int year, int month) {
        return year == 2026 && month >= 1 && month <= 5;
    }
}
