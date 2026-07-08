package com.bviit.analytics.consultation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.consultation.dto.CataractReservationRateItem;
import com.bviit.analytics.consultation.service.CataractReservationRateReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/cataract-reservation-rate")
@RequiredArgsConstructor
public class CataractReservationRateController {

    private final Optional<CataractReservationRateReader> realService;

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<CataractReservationRateItem>>> getTrend(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "cataract") String category
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(
                realService,
                reader -> reader.getMonthlyRates(years, category)
        );
    }
}
