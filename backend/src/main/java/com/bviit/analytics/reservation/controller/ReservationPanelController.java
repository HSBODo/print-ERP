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
 * 예약 패널 API. postgres-mart 프로파일에서는 ReservationMartQueryService(@Primary)가
 * 자동 선택돼 마트를 조회한다. 실 데이터 소스 미연결 시 503 응답.
 */
@RestController
@RequestMapping("/api/stats/reservation")
@RequiredArgsConstructor
public class ReservationPanelController {

    private final Optional<ReservationStatsReader> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getKpi(@RequestParam List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(realService, service -> service.getMonthlyStats(years));
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getTrend(@RequestParam List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(realService, service -> service.getMonthlyStats(years));
    }

    @GetMapping("/composition")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getComposition(@RequestParam List<Integer> years) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(realService, service -> service.getMonthlyStats(years));
    }
}
