package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.reservation.dto.ReservationChangeDailyResult;
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
 * GET /api/reservation-change/daily?from&to
 * 추이 달력 — 일별·구분별 등록 건수와 변경 건수(등록일 기준·예약일 기준 둘 다). 달력 한 달 그리드(최대 6주) 범위로 호출.
 *
 * <p>범위 상한이 예약자 리스트(366일)보다 넓은 이유 — 명단은 변경된 예약만(change_count ≥ 1) 돌려주므로 2022년부터
 * 전부 합쳐도 3만 행 안쪽이라, 화면의 '연도 전체' 조회를 한 번에 받는다.
 * 마트 미연결(local 단독 프로파일)이면 503.
 */
@RestController
@RequestMapping("/api/reservation-change")
@RequiredArgsConstructor
public class ReservationChangeController {

    private static final int MAX_RANGE_DAYS = 3660;
    private static final int MAX_DAILY_RANGE_DAYS = 366;

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

    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<ReservationChangeDailyResult>> getDailyCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_DAILY_RANGE_DAYS);
        return StatsPanelSupport.require(
                reader,
                service -> service.getDailyCounts(from.toString(), to.toString())
        );
    }
}
