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
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
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
     * from..to 범위를 적재한다. 반환값은 upsert된 총 행 수 (관측용).
     * 이 도메인은 모두 월별 aggregate라 실제 delete+insert 없이 upsert만 수행.
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. consultation-rate/stop-reason/reservation-rate(vision+cataract)/watermark
     * 중 하나라도 실패하면 모두 롤백. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public int run(LocalDate from, LocalDate to) {
        log.info("ConsultationMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        // 1) 전환율 upsert (범위에 걸친 (yr,mo)만)
        List<ConsultationRateItem> consultationMonthly =
                consultationRateService.getMonthlyRates(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int consultationRows = writer.upsertConsultationRateMonthly(consultationMonthly);

        // 2) 중단 사유 upsert
        List<StopReasonMonthlyItem> stopReasonMonthly =
                stopReasonStatsService.getMonthlyStats(years).stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int stopReasonRows = writer.upsertStopReasonMonthly(stopReasonMonthly);

        // 3) 예약률 upsert — vision + cataract 각각
        List<CataractReservationRateItem> visionRates =
                cataractReservationRateService.getMonthlyRates(years, "vision").stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int visionRows = writer.upsertReservationRateMonthly("vision", visionRates);

        List<CataractReservationRateItem> cataractRates =
                cataractReservationRateService.getMonthlyRates(years, "cataract").stream()
                        .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                        .toList();
        int cataractRows = writer.upsertReservationRateMonthly("cataract", cataractRates);

        // 4) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        int total = consultationRows + stopReasonRows + visionRows + cataractRows;
        log.info("ConsultationMartJob done: consultation={} stopReason={} vision={} cataract={} total={}",
                consultationRows, stopReasonRows, visionRows, cataractRows, total);
        return total;
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
