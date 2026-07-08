package com.bviit.analytics.consultation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.consultation.dto.StopReasonMonthlyItem;
import com.bviit.analytics.consultation.service.StopReasonStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 검사 중단 사유 통계 API.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StopReasonStatsController {

    private final StopReasonStatsReader stopReasonStatsService;

    /**
     * GET /api/stats/stop-reason/monthly?years=2025,2026
     */
    @GetMapping("/stop-reason/monthly")
    public ResponseEntity<ApiResponse<List<StopReasonMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(stopReasonStatsService.getMonthlyStats(years)));
    }
}
