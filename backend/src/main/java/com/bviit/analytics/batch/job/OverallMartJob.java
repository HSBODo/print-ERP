package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.WatermarkRepository;
import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.service.OverallExamWeeklyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;

/**
 * 전체지표 도메인 마트 적재 잡.
 *
 * mart_overall_exam_weekly 만 채운다.
 * 서비스는 요청 연도의 전 기간 일자별 데이터를 읽어 주 단위로 버킷팅하므로,
 * 배치는 요청 범위에 걸친 연도들의 전체 주 데이터를 upsert한다.
 * 서비스가 데이터가 있는 주만 반환 → 빈 미래 주는 마트에 저장 안 됨.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallMartJob {

    static final String MART_NAME = "overall";

    private final OverallExamWeeklyService overallExamWeeklyService;
    private final OverallMartWriter writer;
    private final WatermarkRepository watermarkRepository;

    public int run(LocalDate from, LocalDate to) {
        log.info("OverallMartJob start: range={}..{}", from, to);
        List<Integer> years = yearsInRange(from, to);

        List<OverallExamWeeklyItem> weekly = overallExamWeeklyService.getWeeklyStats(years);
        int rows = writer.upsertWeekly(weekly);

        watermarkRepository.upsert(MART_NAME, to);

        log.info("OverallMartJob done: rows={}", rows);
        return rows;
    }

    private static List<Integer> yearsInRange(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), y -> y <= to.getYear(), y -> y + 1).toList();
    }
}
