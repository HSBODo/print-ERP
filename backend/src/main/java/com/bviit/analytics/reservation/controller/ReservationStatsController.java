package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.service.ReservationStatsReader;
import com.bviit.analytics.reservation.service.ReservationStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 예약 통계 API.
 * - getStats(기간 요약): 마트에 없어 concrete ReservationStatsService(MSSQL 직결)만 사용.
 * - getMonthlyStats(월별): Reader 인터페이스 → postgres-mart 프로파일에선 마트 조회로 자동 스위치.
 * 실 데이터 리더는 postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ReservationStatsController {

    private static final int MAX_RANGE_DAYS = 366;

    // 기간 요약(getStats)은 마트 미대응이라 MSSQL 직결 concrete 서비스만 사용.
    private final Optional<ReservationStatsService> statsService;
    // 월별(getMonthlyStats)은 마트 대응 — postgres-mart에선 ReservationMartQueryService(@Primary) 선택.
    private final Optional<ReservationStatsReader> statsReader;

    /**
     * 기간 기반 예약 요약 (일별 추이, 채널별, 시간대별)
     * GET /api/stats/reservation?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    @GetMapping("/reservation")
    public ResponseEntity<?> getReservationStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);

        return ResponseEntity.ok(StatsPanelSupport.requireData(
                statsService,
                service -> service.getStats(from, to)
        ));
    }

    /**
     * 연도별 월간 수술/외래/드림렌즈 (프론트 ReservationPage용)
     * GET /api/stats/reservation/monthly?years=2025,2026
     * 응답: { success: true, data: [{year, month, surgery, outpatient, dreamlens, total}, ...] }
     */
    @GetMapping("/reservation/monthly")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.require(statsReader, reader -> reader.getMonthlyStats(years));
    }

}
