package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationOverallMonthlyItem;
import com.bviit.analytics.reservation.service.ReservationOverallStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 예약 종합(콜, 온라인) 통계 API.
 *
 * Reader 인터페이스에만 의존 — postgres-mart 프로파일에서는 MartQueryService(마트 조회)가
 * @Primary 로 주입되고, mssql 프로파일에서는 ReservationOverallStatsService(MSSQL 직결)가 주입된다.
 * 두 프로파일 모두 아닌 경우(H2 dev) Reader 가 없어 503 으로 응답한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ReservationOverallStatsController {

    private final Optional<ReservationOverallStatsReader> reservationOverallStatsReader;

    /**
     * GET /api/stats/reservation-overall/monthly?years=2024,2025,2026
     */
    @GetMapping("/reservation-overall/monthly")
    public ResponseEntity<ApiResponse<List<ReservationOverallMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.resolve(
                false,
                reservationOverallStatsReader,
                service -> service.getMonthlyStats(years),
                List::of
        );
    }
}
