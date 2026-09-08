package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.reservation.dto.ReservationChangeResult;
import com.bviit.analytics.reservation.service.ReservationChangeReader;
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
 * GET /api/reservation-change?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 예약일이 1회 이상 바뀐 검사예약 명단(등록일 범위). 응답: ApiResponse&lt;{rows}&gt; (camelCase 키).
 *
 * <p>범위 상한이 예약자 리스트(366일)보다 넓은 이유 — 마트가 변경된 예약만 담아 2022년부터 전부 합쳐도
 * 3만 행 안쪽이라, 화면의 '연도 전체' 조회를 한 번에 받는다.
 * 마트 미연결(local 단독 프로파일)이면 503.
 */
@RestController
@RequestMapping("/api/reservation-change")
@RequiredArgsConstructor
public class ReservationChangeController {

    private static final int MAX_RANGE_DAYS = 3660;

    private final Optional<ReservationChangeReader> reader;

    @GetMapping
    public ResponseEntity<ApiResponse<ReservationChangeResult>> getReservationChanges(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                reader,
                service -> service.getReservationChanges(from.toString(), to.toString())
        );
    }
}
