package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.IntakeConversionMonthlyItem;
import com.bviit.analytics.reservation.service.IntakeConversionStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 유입(검사예약) API.
 * GET /api/stats/intake-conversion?years=2025,2026
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class IntakeConversionStatsController {

    private final Optional<IntakeConversionStatsService> service;

    @GetMapping("/intake-conversion")
    public ResponseEntity<ApiResponse<List<IntakeConversionMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.require(service, realService -> realService.getMonthlyStats(years));
    }
}
