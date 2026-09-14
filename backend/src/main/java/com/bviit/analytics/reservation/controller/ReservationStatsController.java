package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.service.ReservationStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 예약 통계 API — 월별 계열만 노출.
 * Reader 인터페이스 → postgres-mart 프로파일에선 ReservationMartQueryService(@Primary) 로 자동 스위치.
 * 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ReservationStatsController {

    private final Optional<ReservationStatsReader> statsReader;

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
