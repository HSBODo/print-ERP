package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.surgery.service.SurgeryListReader;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * GET /api/surgery-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 수술자 리스트 행 목록. 기준일은 수술일자, 보조일은 검사일자.
 * 실 데이터 서비스는 postgres-mart 프로파일에서만 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/surgery-list")
@RequiredArgsConstructor
public class SurgeryListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<SurgeryListReader> surgeryListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSurgeryList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                surgeryListService,
                service -> service.getSurgeryList(from.toString(), to.toString())
        );
    }
}
