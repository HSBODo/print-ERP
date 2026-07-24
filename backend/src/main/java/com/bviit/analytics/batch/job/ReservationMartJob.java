package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.repository.ReservationListRepository;
import com.bviit.analytics.reservation.service.ReservationListService;
import com.bviit.analytics.reservation.service.ReservationOverallStatsService;
import com.bviit.analytics.reservation.service.ReservationStatsService;
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
 * 예약 도메인 마트 적재 잡.
 *
 * 네 개의 마트를 채운다:
 *   - mart_reservation_monthly           — 범위에 걸친 각 (yr, mo) upsert (수술/외래/드림렌즈)
 *   - mart_reservation_overall_monthly   — (yr, mo) upsert (예약 종합/콜/온라인). min-year 가드로 24·25 write 차단.
 *   - list_reservation                   — from..to 범위 delete+insert (예약자 명단)
 *   - mart_reservation_kakao_daily       — from..to 범위 delete+insert (해피톡 일별 건수)
 *
 * MSSQL 소스에서 읽기는 기존 서비스(ReservationStatsService, ReservationOverallStatsService,
 * ReservationListService)와 리포지토리(ReservationListRepository.findKakaoDailyCounts) 재사용.
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

    private final ReservationStatsService statsService;
    private final ReservationOverallStatsService overallStatsService;
    private final ReservationListService listService;
    private final ReservationListRepository listRepository;
    private final ReservationMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * from..to 범위를 적재한다.
     *
     *   - Monthly: 범위에 걸친 (yr,mo)만 재계산 후 upsert
     *   - List:    범위 delete+insert (등록일 기준)
     *   - Kakao:   범위 delete+insert (일별 dt 기준)
     *
     * 반환값은 upsert/insert된 총 행 수 (관측용).
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. monthly/list/kakao/watermark 중 하나라도 실패하면
     * 모두 롤백되어 일관성을 보장한다. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReservationMartJob start: range={}..{}", from, to);

        // 1) Monthly upsert — 범위에 걸친 연도들만 재계산
        List<Integer> years = yearsInRange(from, to);
        List<ReservationMonthlyItem> monthly = statsService.getMonthlyStats(years).stream()
                .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        // 2) Overall monthly upsert
        //    - min-year 미만 연도(24·25)는 V12 seed 값 보존 (write 차단)
        //    - 2026-01~05 는 V24 골든 시드 보존 (write 차단) — 담당자 확정값
        List<ReservationOverallMonthlyItem> overallMonthly =
                overallStatsService.getMonthlyStats(years).stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> !isOverallSeededMonth(m.getYear(), m.getMonth()))
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int overallRows = writer.upsertOverallMonthly(overallMonthly);

        // 3) List delete+insert
        List<Map<String, Object>> listRows =
                listService.getReservationList(from.toString(), to.toString()).rows();
        int listRowsCount = writer.replaceList(from, to, listRows);

        // 4) Kakao daily delete+insert
        List<Map<String, Object>> kakaoRows =
                listRepository.findKakaoDailyCounts(from.toString(), to.toString());
        int kakaoRowsCount = writer.replaceKakaoDaily(from, to, kakaoRows);

        // 5) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "mart_reservation_monthly", monthlyRows,
                "mart_reservation_overall_monthly", overallRows,
                "list_reservation", listRowsCount,
                "mart_reservation_kakao_daily", kakaoRowsCount
        );
        log.info("ReservationMartJob done: {}", stats);
        return stats;
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
