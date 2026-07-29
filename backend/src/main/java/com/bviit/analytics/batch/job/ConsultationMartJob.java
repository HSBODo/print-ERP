package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.service.CataractReservationRateService;
import com.bviit.analytics.consultation.service.ConsultationRateService;
import com.bviit.analytics.consultation.service.StopReasonStatsService;
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
 * 전환·성공률 도메인 마트 적재 잡.
 *
 * 세 개의 마트를 채운다:
 *   - mart_consultation_rate_monthly    — 범위에 걸친 각 (yr,mo) upsert
 *   - mart_stop_reason_monthly          — 동일하게 (yr,mo) upsert
 *   - mart_reservation_rate_monthly     — (yr,mo,category='vision'|'cataract') 각각 upsert
 *
 * MSSQL 소스에서 읽기는 기존 서비스(ConsultationRateService, StopReasonStatsService,
 * CataractReservationRateService) 재사용. 예약률은 두 카테고리 순차 호출.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ConsultationMartJob {

    static final String MART_NAME = "consultation";

    private final ConsultationRateService consultationRateService;
    private final StopReasonStatsService stopReasonStatsService;
    private final CataractReservationRateService cataractReservationRateService;
    private final ConsultationMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    /**
     * 24·25 seed 보호용 min-year 가드.
     * - reservation-rate: V13 시드 보호
     * - consultation-rate: V18 시드(일반예약률) 보호
     * stop-reason 은 24·25 시드가 없으므로 min-year 이하도 write 허용.
     */
    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * from..to 범위를 적재한다. 반환값은 upsert된 총 행 수 (관측용).
     * 이 도메인은 모두 월별 aggregate라 실제 delete+insert 없이 upsert만 수행.
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. consultation-rate/stop-reason/reservation-rate(vision+cataract)/watermark
     * 중 하나라도 실패하면 모두 롤백. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ConsultationMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        // 1) 전환율 upsert — min-year 미만 연도는 V18 시드(일반예약률) 보존 (write 차단)
        //    2026-01~05 는 V27 골든 시드(상담성공률 3종 · 시력교정 일반예약률) 구간 — 스킵.
        List<ConsultationRateItem> consultationMonthly =
                consultationRateService.getMonthlyRates(years).stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> !is2026H1Seeded(m.getYear(), m.getMonth()))
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int consultationRows = writer.upsertConsultationRateMonthly(consultationMonthly);

        // 2) 중단 사유 upsert
        List<StopReasonMonthlyItem> stopReasonMonthly =
                stopReasonStatsService.getMonthlyStats(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int stopReasonRows = writer.upsertStopReasonMonthly(stopReasonMonthly);

        // 3) 예약률 upsert — vision + cataract 각각. min-year 미만 연도는 V13 seed 값 보존 (write 차단)
        //    2026-01~05 는 V27 골든 시드(시력교정·백내장 예약률) 구간 — 스킵.
        List<CataractReservationRateItem> visionRates =
                cataractReservationRateService.getMonthlyRates(years, "vision").stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> !is2026H1Seeded(m.getYear(), m.getMonth()))
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int visionRows = writer.upsertReservationRateMonthly("vision", visionRates);

        List<CataractReservationRateItem> cataractRates =
                cataractReservationRateService.getMonthlyRates(years, "cataract").stream()
                        .filter(m -> m.getYear() >= minYear)
                        .filter(m -> !is2026H1Seeded(m.getYear(), m.getMonth()))
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int cataractRows = writer.upsertReservationRateMonthly("cataract", cataractRates);

        // 4) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        // mart_reservation_rate_monthly 는 category(vision/cataract)로 나뉜 논리 파티션.
        // 통계 관측 편의를 위해 두 카테고리를 각각 표기.
        Map<String, Integer> stats = Map.of(
                "mart_consultation_rate_monthly", consultationRows,
                "mart_stop_reason_monthly", stopReasonRows,
                "mart_reservation_rate_monthly[vision]", visionRows,
                "mart_reservation_rate_monthly[cataract]", cataractRows
        );
        log.info("ConsultationMartJob done: {}", stats);
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
     * 2026-01~05 골든 시드 구간 판정.
     * V27 이 mart_consultation_rate_monthly(상담성공률·시력교정 일반예약률) 와
     * mart_reservation_rate_monthly(시력교정·백내장 예약률) 확정값을 못 박은 구간이라
     * 배치 재계산 결과로 덮지 않는다.
     * (mart_stop_reason_monthly 는 아직 시드 없음 — 이 필터 대상 아님.)
     */
    private static boolean is2026H1Seeded(int year, int month) {
        return year == 2026 && month >= 1 && month <= 5;
    }
}
