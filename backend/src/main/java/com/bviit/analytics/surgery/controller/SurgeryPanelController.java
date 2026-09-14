package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.surgery.service.SurgeryStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/surgery")
@RequiredArgsConstructor
public class SurgeryPanelController {

    private final Optional<SurgeryStatsReader> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(@RequestParam List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(realService, service -> service.getMonthlyStats(years));
    }

    @GetMapping("/panel/trend")
    public ResponseEntity<ApiResponse<List<?>>> getTrend(@RequestParam List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(realService, service -> service.getMonthlyStats(years));
    }

    @GetMapping("/panel/composition")
    public ResponseEntity<ApiResponse<List<?>>> getComposition(@RequestParam List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(realService, service -> service.getMonthlyStats(years));
    }
}
