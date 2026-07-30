package com.bviit.analytics.report.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.report.dto.WeeklyReportItem;
import com.bviit.analytics.report.service.WeeklyReportReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 주차 레포트 API — 월간 레포트와 같은 도표를 ISO 8601 연간 주차로 조회한다.
 * 실 데이터 리더는 mssql·postgres-mart 프로파일에서 주입되고, 미연결 시 503 으로 응답한다.
 */
@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
public class WeeklyReportController {

    private final Optional<WeeklyReportReader> weeklyReportService;

    /**
     * 연도별 주차 레포트 원시 집계.
     * GET /api/report/weekly?years=2024,2025,2026
     *
     * 응답: { success: true, data: [{year, week, startDate, endDate, ...원시 집계}, ...] }
     * 데이터가 있는 주만 내려간다 — 프론트가 1~52/53주를 열거해 빈 주는 선을 끊는다.
     */
    @GetMapping("/weekly")
    public ResponseEntity<ApiResponse<List<WeeklyReportItem>>> getWeeklyReport(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.require(weeklyReportService, service -> service.getWeeklyStats(years));
    }
}
