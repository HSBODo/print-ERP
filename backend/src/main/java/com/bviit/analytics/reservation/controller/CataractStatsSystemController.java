package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.service.CataractStatsSystemQueryService;
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

/**
 * 예약통계_백내장 API (백내장=RESERVE_FLAG='H').
 *
 *   GET  /api/stats/reservation-stats-cataract?from&to   일자별 원시 카운트 (postgres-mart 프로파일: Postgres 마트, override 오버레이).
 *   POST /api/stats/reservation-stats-cataract/cell?period&date&field&value   셀 손보정(인입콜/응대콜).
 *   GET  /api/stats/reservation-stats-cataract/diagnostics/*                  진단(diff/drill-down/parity/health).
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-cataract")
@RequiredArgsConstructor
public class CataractStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;

    private final CataractStatsSystemQueryService queryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CataractStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        ReservationStatsResult<List<CataractStatsDailyRow>> result =
                queryService.getDailyCounts(from, to, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    /**
     * 셀 손보정 — 특정 일자의 인입콜/응대콜을 직접 고친다(휴가 등 라이브 어긋남 교정).
     * postgres-mart 프로파일: reservation_stats_override 에 INSERT-only 로 이력 append.
     */
    @PostMapping("/cell")
    public ResponseEntity<ApiResponse<CataractStatsDailyRow>> editCell(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field,
            @RequestParam int value,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        CataractStatsDailyRow updated = queryService.editCell(
                period,
                date.toString(),
                field,
                value,
                username(authentication)
        );
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @GetMapping("/diagnostics/diff")
    public ResponseEntity<ApiResponse<ReservationStatsDiffResponse>> diff(@RequestParam String period) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.diff(period)));
    }

    @GetMapping("/diagnostics/drill-down")
    public ResponseEntity<ApiResponse<ReservationStatsDrillDownResponse>> drillDown(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.drillDown(period, date.toString(), field)));
    }

    @GetMapping("/diagnostics/parity")
    public ResponseEntity<ApiResponse<ReservationStatsParityResponse>> parity(
            @RequestParam String period,
            @RequestParam String field
    ) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.parity(period, field)));
    }

    @GetMapping("/diagnostics/health")
    public ResponseEntity<ApiResponse<ReservationStatsDiagnosticsHealthResponse>> health(@RequestParam String period) {
        StatsRequestValidator.validatePeriod(period);
        return ResponseEntity.ok(ApiResponse.ok(queryService.health(period)));
    }

    private static String username(Authentication authentication) {
        return authentication != null ? authentication.getName() : "unknown";
    }
}
