package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.exam.repository.MockExaminationRepository;
import com.bviit.analytics.exam.service.ExaminationStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/examination")
@RequiredArgsConstructor
public class ExaminationPanelController {

    private final MockExaminationRepository mockRepository;
    private final Optional<ExaminationStatsReader> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "false") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
                () -> mockRepository.findKpiByYears(years)
        );
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<?>>> getTrend(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "false") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
                () -> mockRepository.findMonthlyByYears(years)
        );
    }

    @GetMapping("/composition")
    public ResponseEntity<ApiResponse<List<?>>> getComposition(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "false") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
                () -> mockRepository.findMonthlyByYears(years)
        );
    }
}
