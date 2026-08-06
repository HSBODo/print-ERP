package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.reservation.dto.ReservationChannelFunnelItem;
import com.bviit.analytics.reservation.repository.ReservationChannelMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 예약통계_채널별.
 *
 * GET /api/stats/reservation-channel?from=YYYY-MM-DD&amp;to=YYYY-MM-DD
 * 예약자 리스트와 같은 행을 채널로 묶어 퍼널(예약 → 취소제외 → 접수 → 검사 → 수술)로 돌려준다.
 * 마트가 없는 프로파일에서는 503 으로 응답한다(MSSQL 직결 경로를 두지 않는다).
 */
@RestController
@RequestMapping("/api/stats/reservation-channel")
@RequiredArgsConstructor
public class ReservationChannelController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReservationChannelMartRepository> repository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReservationChannelFunnelItem>>> getFunnel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                repository,
                repo -> repo.findFunnel(from.toString(), to.toString())
        );
    }
}
