package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.service.SurgeryListService;
import com.bviit.analytics.surgery.service.SurgeryStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 *   - mart_surgery_monthly  — 대상 기간의 각 (yr, mo) upsert
 *   - mart_surgery_daily    — from..to 각 날짜 upsert
 *   - list_surgery          — from..to 범위 delete+insert
 *
 * MSSQL 소스에서 읽기는 기존 서비스(SurgeryStatsService, SurgeryListService) 재사용.
 * 월별은 LEGACY_VISION_SURGERY 보정치가 적용된 값으로 저장됨(현재 UI 값과 일치).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SurgeryMartJob {

    static final String MART_NAME = "surgery";

    private final SurgeryStatsService statsService;
    private final SurgeryListService listService;
    private final SurgeryMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    /**
     * from..to 범위를 적재한다.
     *
     *   - Daily: 각 날짜 upsert
     *   - Monthly: 범위에 걸친 (yr,mo) 조합을 SurgeryStatsService.getMonthlyStats로 재계산 후 upsert
     *   - List: 범위 delete+insert
     *
     * 반환값은 upsert/insert된 총 행 수 (관측용).
     *
     * 트랜잭션: 도메인 단위 all-or-nothing. daily/monthly/list/watermark 중 하나라도 실패하면
     * 모두 롤백되어 일관성을 보장한다. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public int run(LocalDate from, LocalDate to) {
        log.info("SurgeryMartJob start: range={}..{}", from, to);

        // 1) Daily upsert
        List<SurgeryDailyItem> daily = statsService.getDailyStats(from.toString(), to.toString());
        int dailyRows = writer.upsertDaily(daily);

        // 2) Monthly upsert — 기간에 걸친 연도들만 재계산
        List<Integer> years = yearsInRange(from, to);
        List<SurgeryMonthlyItem> monthly = statsService.getMonthlyStats(years).stream()
                .filter(m -> isMonthInRange(m.getYear(), m.getMonth(), from, to))
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        // 3) List delete+insert
        List<Map<String, Object>> listRows = listService.getSurgeryList(from.toString(), to.toString());
        int listRowsCount = writer.replaceList(from, to, listRows);

        // 4) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        int total = dailyRows + monthlyRows + listRowsCount;
        log.info("SurgeryMartJob done: daily={} monthly={} list={} total={}",
                dailyRows, monthlyRows, listRowsCount, total);
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
