package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.service.SurgeryCompositionReader;
import com.bviit.analytics.surgery.service.SurgeryStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 수술 통계 API.
 * 실 데이터 서비스는 postgres-mart 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class SurgeryStatsController {

    /** ISO 53주차 연간 조회(1주차 월요일~53주차 일요일 = 371일)를 담는 상한. */
    private static final int MAX_RANGE_DAYS = 371;

    private final Optional<SurgeryStatsReader> surgeryService;
    private final Optional<SurgeryCompositionReader> compositionReader;

    /**
     * 연도별 월간 수술 유형별 건수 (프론트 SurgeryPage용).
     * GET /api/stats/surgery/monthly?years=2025,2026
     */
    @GetMapping("/surgery/monthly")
    public ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        return getValidatedMonthlyStats(years);
    }

    /**
     * 수술별 비중 (프론트 SurgeryRatioPage용).
     * GET /api/stats/surgery-ratio?years=2025,2026
     *
     * 응답 형태는 /surgery/monthly와 동일 — 프론트에서 비중(%) 계산.
     */
    @GetMapping("/surgery-ratio")
    public ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getSurgeryRatio(
            @RequestParam List<Integer> years
    ) {
        return getValidatedMonthlyStats(years);
    }

    /**
     * 일자별 수술 유형별 건수 (수술별 비중 페이지 일별 모드용).
     * postgres-mart 에서는 {@code mart_surgery_daily} 조회, mssql 전용에서는 소스 라이브 집계.
     * GET /api/stats/surgery/daily?from=2026-06-01&to=2026-06-30
     */
    @GetMapping("/surgery/daily")
    public ResponseEntity<ApiResponse<List<SurgeryDailyItem>>> getDailyStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        SurgeryCompositionReader.DailyResult result = StatsPanelSupport.requireData(
                compositionReader, reader -> reader.getDaily(from, to, username(authentication)));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    private static String username(Authentication authentication) {
        return authentication != null ? authentication.getName() : "unknown";
    }

    private ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getValidatedMonthlyStats(List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(surgeryService, service -> service.getMonthlyStats(years));
    }
}
