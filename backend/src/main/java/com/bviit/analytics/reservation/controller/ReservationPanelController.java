package com.bviit.analytics.reservation.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.reservation.dto.ReservationMonthlyItem;
import com.bviit.analytics.reservation.repository.MockReservationRepository;
import com.bviit.analytics.reservation.service.ReservationStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 예약 패널 API — 프로파일 제한 없음.
 * mock=true → SQLite 더미 데이터, mock=false → 실 데이터 (mssql·postgres-mart 프로파일 필요).
 * postgres-mart 프로파일에서는 ReservationMartQueryService(@Primary)가 자동 선택돼 마트를 조회한다.
 */
@RestController
@RequestMapping("/api/stats/reservation")
@RequiredArgsConstructor
public class ReservationPanelController {

    private final MockReservationRepository mockRepository;
    private final Optional<ReservationStatsReader> realService;

    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<List<?>>> getKpi(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
                () -> toKpiRows(mockRepository.findKpiByYears(years))
        );
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getTrend(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
                () -> toMonthlyItems(years)
        );
    }

    @GetMapping("/composition")
    public ResponseEntity<ApiResponse<List<ReservationMonthlyItem>>> getComposition(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "true") boolean mock
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.resolve(
                mock,
                realService,
                service -> service.getMonthlyStats(years),
                () -> toMonthlyItems(years)
        );
    }

    private List<KpiRow> toKpiRows(List<Map<String, Object>> rows) {
        return rows.stream().map(row -> new KpiRow(
                toInt(row.get("year")),
                toInt(row.get("surgery")),
                toInt(row.get("outpatient")),
                toInt(row.get("dreamlens")),
                toInt(row.get("total"))
        )).toList();
    }

    private List<ReservationMonthlyItem> toMonthlyItems(List<Integer> years) {
        return mockRepository.findMonthlyByYears(years).stream()
                .map(r -> ReservationMonthlyItem.builder()
                        .year(toInt(r.get("year"))).month(toInt(r.get("month")))
                        .surgery(toInt(r.get("surgery"))).outpatient(toInt(r.get("outpatient")))
                        .dreamlens(toInt(r.get("dreamlens"))).total(toInt(r.get("total")))
                        .build())
                .toList();
    }

    record KpiRow(int year, int surgery, int outpatient, int dreamlens, int total) {}
}
