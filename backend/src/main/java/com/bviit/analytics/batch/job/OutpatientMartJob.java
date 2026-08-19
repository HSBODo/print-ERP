package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.repository.OutpatientCountStatsMartRepository;
import com.bviit.analytics.outpatient.service.OutpatientListService;
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
 * 외래 도메인 마트 적재 잡.
 *
 * 두 개의 마트를 채운다:
 *   - list_outpatient               — from..to 예약일 범위 delete+insert (MSSQL 소스)
 *   - mart_outpatient_count_monthly — (yr,mo) upsert. **위 리스트를 월로 접어** 만든다.
 *                                     min-year 가드로 24·25 write 차단, 2026-01~05 골든시드 스킵.
 *
 * 리스트가 월별 지표의 정의 원천 — 화면 리스트와 정의가 하나다.
 * 종전에는 월별을 MSSQL 쪽 별도 쿼리(OutpatientCountStatsService)가 계산해
 * 정의가 어긋날 위험이 있었다. 검사·수술이 먼저 같은 문제로 리팩터됐고
 * (ExamMartJob.java:65-69 주석 참조), 외래수도 같은 패턴으로 이관.
 *
 * MSSQL 직결 서비스(OutpatientCountStatsService)는 배치에서 더 이상 안 쓰지만
 * OutpatientReconcileService의 대사(reconcile) 소스로 유지된다.
 *
 * 24·25 확정값은 V9 seed가 mart에 넣은 값을 유일 원천으로 유지한다.
 * runManual로 24·25 범위를 실행해도 monthly upsert는 min-year 이상 연도만 수행.
 * 리스트(list_outpatient)는 min-year 가드를 따르지 않는다(delete+insert의 특성상 범위 그대로 재적재).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientMartJob {

    static final String MART_NAME = "outpatient";

    private final OutpatientListService outpatientListService;
    private final OutpatientCountStatsMartRepository outpatientMartRepository;
    private final OutpatientMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. list delete/insert + monthly upsert + watermark 갱신을 하나로
     * 묶어 부분 커밋을 방지. MSSQL 읽기는 별도 datasource이므로 이 트랜잭션과 무관.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("OutpatientMartJob start: range={}..{}", from, to);

        // ── 순서 주의 ──────────────────────────────────────────────
        // 리스트를 **먼저** 적재한다. 월별 집계가 그 리스트(list_outpatient)를 읽기 때문이다.
        // 종전에는 월별이 MSSQL 을 각자 조회했다 — 같은 지표가 두 벌로 구현돼
        // 정의가 바뀌면 어긋났다(검사 도메인 2026-08-05 원데이 3건 참조).
        // ──────────────────────────────────────────────────────────

        // 1) list_outpatient delete+insert (예약일 기준)
        List<Map<String, Object>> outpatientListRows =
                outpatientListService.getOutpatientList(from.toString(), to.toString());
        int listInserted = writer.replaceListOutpatient(from, to, outpatientListRows);

        // 2) 월별 집계 — 방금 적재한 리스트를 월로 접는다(= 화면 리스트와 같은 정의).
        //    min-year 미만 연도는 V9 seed 보존, 2026-01~05 는 V27 골든 시드 구간 — 둘 다 스킵.
        Map<YearMonth, Integer> byMonth = aggregateByMonth(
                outpatientMartRepository.findOutpatientDailyAgg(from.toString(), to.toString()));

        List<OutpatientCountMonthlyItem> monthly = byMonth.entrySet().stream()
                .filter(e -> e.getKey().getYear() >= minYear)
                .filter(e -> !is2026H1Seeded(e.getKey().getYear(), e.getKey().getMonthValue()))
                .filter(e -> isMonthInRange(e.getKey().getYear(), e.getKey().getMonthValue(), from, to))
                .map(e -> OutpatientCountMonthlyItem.builder()
                        .year(e.getKey().getYear())
                        .month(e.getKey().getMonthValue())
                        .outpatientCount(e.getValue())
                        .total(e.getValue())
                        .build())
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        // 3) Watermark 갱신 (성공 시에만)
        watermarkRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = new LinkedHashMap<>();
        stats.put("mart_outpatient_count_monthly", monthlyRows);
        stats.put("list_outpatient", listInserted);
        log.info("OutpatientMartJob done: {}", stats);
        return stats;
    }

    /** 일별 집계를 월로 접는다. 주차 레포트는 같은 행을 ISO 주차로 접는다(정의는 리스트 하나). */
    private static Map<YearMonth, Integer> aggregateByMonth(List<Map<String, Object>> dailyRows) {
        Map<YearMonth, Integer> byMonth = new LinkedHashMap<>();
        for (Map<String, Object> row : dailyRows) {
            LocalDate day = ((java.sql.Date) row.get("d")).toLocalDate();
            byMonth.merge(YearMonth.from(day), intOf(row, "total"), Integer::sum);
        }
        return byMonth;
    }

    private static int intOf(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    private static boolean isMonthInRange(int year, int month, LocalDate from, LocalDate to) {
        YearMonth ym = YearMonth.of(year, month);
        YearMonth ymFrom = YearMonth.from(from);
        YearMonth ymTo = YearMonth.from(to);
        return !ym.isBefore(ymFrom) && !ym.isAfter(ymTo);
    }

    /**
     * mart_outpatient_count_monthly 의 골든 시드 구간 판정.
     * 2026-01~05 는 V27 시드가 담당자 확정값을 못 박은 구간이라 배치 재계산 결과로 덮지 않는다.
     */
    private static boolean is2026H1Seeded(int year, int month) {
        return year == 2026 && month >= 1 && month <= 5;
    }
}
