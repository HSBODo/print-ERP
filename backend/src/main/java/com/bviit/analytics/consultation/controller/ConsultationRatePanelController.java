package com.bviit.analytics.consultation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.consultation.repository.MockConsultationRateRepository;
import com.bviit.analytics.consultation.service.ConsultationRateReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/consultation-rate")
@RequiredArgsConstructor
public class ConsultationRatePanelController {

    private final MockConsultationRateRepository mockRepository;
    private final Optional<ConsultationRateReader> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years, @RequestParam(defaultValue = "false") boolean mock) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyRates(years),
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
                service -> service.getMonthlyRates(years),
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
                service -> service.getMonthlyRates(years),
                () -> mockRepository.findMonthlyByYears(years)
        );
    }
}
