package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationListResult;
import com.bviit.analytics.reservation.service.ReservationListReader;
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
 * GET /api/reservation-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 예약자 명단. 응답: ApiResponse&lt;{rows:List&lt;Map&gt;}&gt; (camelCase 키).
 * 실 데이터 리더는 mssql·postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 * postgres-mart 프로파일에서는 ReservationListMartQueryService(@Primary)가 자동 선택돼 마트를 조회한다.
 */
@RestController
@RequestMapping("/api/reservation-list")
@RequiredArgsConstructor
public class ReservationListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReservationListReader> reservationListService;

    @GetMapping
    public ResponseEntity<ApiResponse<ReservationListResult>> getReservationList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                reservationListService,
                service -> service.getReservationList(from.toString(), to.toString())
        );
    }
}
