package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.reservation.dto.ReservationListHomepageResult;
import com.bviit.analytics.reservation.service.ReservationListHomepageReader;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 예약자 리스트_홈페이지 — 레거시 관리자 화면 counsel/online_list.php(SCR-39) 목록.
 *
 * <p>GET /api/reservation-list-homepage?from=2026-06-01&to=2026-06-30
 *
 * <p>조회 전용이다. 레거시 화면의 쓰기 액션(삭제·공개여부 토글·완료처리)은 옮기지 않는다.
 * 소스 미설정 시 Reader 빈이 없어 503 이 나간다.
 */
@RestController
@RequestMapping("/api/reservation-list-homepage")
@RequiredArgsConstructor
public class ReservationListHomepageController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReservationListHomepageReader> reservationListHomepageService;

    @GetMapping
    public ResponseEntity<ApiResponse<ReservationListHomepageResult>> getReservationListHomepage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);

        return StatsPanelSupport.require(reservationListHomepageService,
                service -> service.getReservationListHomepage(from.toString(), to.toString()));
    }
}
