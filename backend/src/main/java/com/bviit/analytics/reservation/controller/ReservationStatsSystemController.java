package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDiffResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsDrillDownResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsParityResponse;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import com.bviit.analytics.reservation.service.ReservationStatsSnapshotStore;
import com.bviit.analytics.reservation.service.ReservationStatsSystemQueryService;
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
 * 예약통계시스템(BCRM RSS 컨택통계) API.
 *
 *   GET  /api/stats/reservation-stats-system?from&to   일자별 원시 카운트 — 확정 스냅샷 우선.
 *        조회=호출 통합: 당월·미잠금이고 오늘 아직 안 채웠으면 D-1까지 1회 증분 채움(있으면 보존) 후 반환.
 *   POST /api/stats/reservation-stats-system/snapshot?period=YYYY-MM   해당 월을 1회 조회해 JSON 스냅샷 확정 저장.
 *   GET  /api/stats/reservation-stats-system/snapshots   확정된 월 목록.
 *
 * 라이브 조회·저장은 mssql 프로파일에서만(EICN_MySQL 링크드서버 경유). 스냅샷 읽기는 프로파일 무관.
 */
@RestController
@RequestMapping("/api/stats/reservation-stats-system")
@RequiredArgsConstructor
public class ReservationStatsSystemController {

    private static final int MAX_RANGE_DAYS = 92;

    private final ReservationStatsSystemQueryService queryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReservationStatsDailyRow>>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        ReservationStatsResult<List<ReservationStatsDailyRow>> result =
                queryService.getDailyCounts(from, to, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<ReservationStatsSnapshot>> saveSnapshot(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsResult<ReservationStatsSnapshot> result =
                queryService.saveSnapshot(period, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    /**
     * 호출(증분 채움) — 해당 월을 D-1까지 라이브 조회해 기존 스냅샷의 비어있는 날짜만 채운다(있으면 보존).
     * 진행 중인 달을 매일 이어붙이는 용도. PDF 고정월은 차단.
     */
    @PostMapping("/fill")
    public ResponseEntity<ApiResponse<ReservationStatsSnapshot>> fill(
            @RequestParam String period,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsResult<ReservationStatsSnapshot> result =
                queryService.fillSnapshot(period, username(authentication));
        return ResponseEntity.ok(ApiResponse.ok(result.data(), result.meta()));
    }

    /**
     * 셀 손보정 — 특정 일자의 홈페이지/네이버 온라인예약 원시 카운트(6개 필드)를 직접 고친다.
     * 스냅샷 파일만 갱신(라이브/MSSQL 불필요)하며 수정 이력을 남긴다. locked 월도 허용(이력으로 추적).
     */
    @PostMapping("/cell")
    public ResponseEntity<ApiResponse<ReservationStatsDailyRow>> editCell(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String field,
            @RequestParam int value,
            Authentication authentication
    ) {
        StatsRequestValidator.validatePeriod(period);
        ReservationStatsDailyRow updated = queryService.editCell(
                period,
                date.toString(),
                field,
                value,
                username(authentication)
        );
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @GetMapping("/snapshots")
    public ResponseEntity<ApiResponse<List<ReservationStatsSnapshotStore.SnapshotInfo>>> listSnapshots() {
        return ResponseEntity.ok(ApiResponse.ok(queryService.listSnapshots()));
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
