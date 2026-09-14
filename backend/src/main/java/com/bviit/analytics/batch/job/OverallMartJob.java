package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.service.OverallExamListAggregator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * 전체지표 도메인 마트 적재 잡.
 *
 * mart_overall_exam_weekly + mart_overall_exam_monthly 를 함께 채운다.
 * v_all_exam_list(V56 확장) 을 일자별 집계 후 주 단위로 버킷팅하고, 월별은 그 주별을 롤업한다.
 * 데이터가 있는 주만 반환 → 빈 미래 주/월은 마트에 저장 안 됨.
 *
 * EXAM 도메인({@code ExamMartJob})이 먼저 list_exam·list_cataract_exam 을 채워두므로
 * 그 위에서 계산 — MSSQL 접근 없음. BatchOrchestrator 는 EXAM → OVERALL 순으로 실행.
 *
 * 24·25 는 V14+V16 SQL 시드가 SSOT. min-year 가드로 배치가 24·25 를 write 하지 못하도록
 * 차단한다(runManual 로 과거 범위를 지정해도 무시하여 시드값을 보호).
 * 2026-01~05 는 V27 골든 시드 구간 — is2026H1Seeded 로 덮기 금지.
 *
 * MSSQL 직결 {@link OverallExamWeeklyService}·{@link OverallExamMonthlyService} 는 대사(reconcile) 용도로 유지.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallMartJob {

    static final String MART_NAME = "overall";

    private final OverallExamListAggregator overallExamListAggregator;
    private final OverallMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    @Value("${batch.mart.min-year:2026}")
    private int minYear;

    /**
     * 트랜잭션: 도메인 단위 all-or-nothing. weekly·monthly upsert + 성공 로그 갱신을 하나로 묶어
     * 부분 커밋을 방지. v_all_exam_list 재집계라 martJdbcTemplate 하나만 사용.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("OverallMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<OverallExamWeeklyItem> weekly = overallExamListAggregator.getWeeklyStats(years);
        int weeklyRows = writer.upsertWeekly(weekly);

        // 2026-01~05 는 V27 골든 시드가 담당자 확정값을 못 박은 구간 — 배치가 재계산해 덮으면 확정값을 잃는다.
        List<OverallExamMonthlyItem> monthly = overallExamListAggregator.getMonthlyStats(years).stream()
                .filter(m -> m.getYear() >= minYear)
                .filter(m -> !is2026H1Seeded(m.getYear(), m.getMonth()))
                .toList();
        int monthlyRows = writer.upsertMonthly(monthly);

        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of(
                "mart_overall_exam_weekly", weeklyRows,
                "mart_overall_exam_monthly", monthlyRows
        );
        log.info("OverallMartJob done: {}", stats);
        return stats;
    }

    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1).toList();
    }

    /**
     * mart_overall_exam_monthly 의 골든 시드 구간 판정.
     * 2026-01~05 는 V27 시드가 담당자 확정값을 못 박은 구간이라 배치 재계산 결과로 덮지 않는다.
     */
    private static boolean is2026H1Seeded(int year, int month) {
        return year == 2026 && month >= 1 && month <= 5;
    }
}
