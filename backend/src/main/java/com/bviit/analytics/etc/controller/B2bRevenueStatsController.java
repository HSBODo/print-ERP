package com.bviit.analytics.etc.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import com.bviit.analytics.etc.service.B2bRevenueStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class B2bRevenueStatsController {

    private final Optional<B2bRevenueStatsReader> b2bRevenueStatsService;

    @GetMapping("/b2b-revenue")
    public ResponseEntity<ApiResponse<List<B2bRevenueMonthlyItem>>> getMonthlyRevenue(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.require(b2bRevenueStatsService, service -> service.getMonthlyRevenue(years));
    }
}
