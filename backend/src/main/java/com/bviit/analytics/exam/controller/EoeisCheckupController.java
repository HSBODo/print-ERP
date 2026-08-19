package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.exam.dto.EoeisCheckupResult;
import com.bviit.analytics.exam.service.EoeisCheckupService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Optional;

@RestController
@RequestMapping("/api/eoeis-checkup")
@RequiredArgsConstructor
public class EoeisCheckupController {

    private static final LocalDate MIN_DATE = LocalDate.of(2026, 7, 1);
    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<EoeisCheckupService> service;

    @GetMapping
    public ResponseEntity<ApiResponse<EoeisCheckupResult>> getStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        if (from.isBefore(MIN_DATE)) {
            throw new IllegalArgumentException("아이리더 통계는 2026-07-01부터 조회할 수 있습니다.");
        }
        return StatsPanelSupport.require(service, reader -> reader.getStats(from, to));
    }
}
