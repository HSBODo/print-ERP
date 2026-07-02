package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.stats.MonthlySnapshotStore;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.dto.SurgerySnapshot;
import com.bviit.analytics.surgery.service.SurgeryCompositionQueryService;
import com.bviit.analytics.surgery.service.SurgeryStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 수술 통계 API.
 * 실 데이터 서비스는 mssql 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class SurgeryStatsController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<SurgeryStatsReader> surgeryService;
    private final SurgeryCompositionQueryService compositionQueryService;

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
     * 일자별 수술 유형별 건수 (수술별 비중 페이지 일별 모드용) — 스냅샷 우선 + 조회=호출(증분 적재).
     * 당월이면 조회 시 전일(D-1)까지 비어있는 날짜만 채워 적재하고, 이미 적재된 일자는 동결한다.
     * GET /api/stats/surgery/daily?from=2026-06-01&to=2026-06-30
     */
    @GetMapping("/surgery/daily")
    public ResponseEntity<ApiResponse<List<SurgeryDailyItem>>> getDailyStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        SurgeryCompositionQueryService.DailyResult result =
                compositionQueryService.getDaily(from, to, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    /**
     * 호출(증분 적재) — 해당 월을 전일까지 라이브 조회해 비어있는 날짜만 적재(있으면 보존).
     * POST /api/stats/surgery/daily/fill?period=YYYY-MM
     */
    @PostMapping("/surgery/daily/fill")
    public ResponseEntity<ApiResponse<SurgerySnapshot>> fillDaily(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(compositionQueryService.fill(period, username(authentication))));
    }

    /**
     * 확정(재집계) — 해당 월 전일까지 1회 조회해 월 전체를 덮어쓴다.
     * POST /api/stats/surgery/daily/snapshot?period=YYYY-MM
     */
    @PostMapping("/surgery/daily/snapshot")
    public ResponseEntity<ApiResponse<SurgerySnapshot>> saveDaily(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(compositionQueryService.save(period, username(authentication))));
    }

    /** 적재된 월 목록. GET /api/stats/surgery/daily/snapshots */
    @GetMapping("/surgery/daily/snapshots")
    public ResponseEntity<ApiResponse<List<MonthlySnapshotStore.SnapshotInfo>>> listDailySnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(compositionQueryService.listSnapshots()));
    }

    private static String username(Authentication authentication) {
        return authentication != null ? authentication.getName() : "unknown";
    }

    private ResponseEntity<ApiResponse<List<SurgeryMonthlyItem>>> getValidatedMonthlyStats(List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                false,
                surgeryService,
                service -> service.getMonthlyStats(years),
                List::of
        );
    }
}
