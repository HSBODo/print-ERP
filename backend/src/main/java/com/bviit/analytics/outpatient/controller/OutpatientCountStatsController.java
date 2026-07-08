package com.bviit.analytics.outpatient.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import com.bviit.analytics.outpatient.service.OutpatientCountStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 외래수 통계 API.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class OutpatientCountStatsController {

    private final OutpatientCountStatsReader outpatientCountStatsService;

    /**
     * GET /api/stats/outpatient-count/monthly?years=2024,2025,2026
     */
    @GetMapping("/outpatient-count/monthly")
    public ResponseEntity<ApiResponse<List<OutpatientCountMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return ResponseEntity.ok(ApiResponse.ok(outpatientCountStatsService.getMonthlyStats(years)));
    }
}
