package com.bviit.analytics.outpatient.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.outpatient.service.OutpatientListReader;
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
 * GET /api/outpatient-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * 외래수 리스트(외래 예약 F + 내원/퇴원 I,H) 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키).
 * 실 데이터 리더는 mssql·postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 */
@RestController
@RequestMapping("/api/outpatient-list")
@RequiredArgsConstructor
public class OutpatientListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<OutpatientListReader> outpatientListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getOutpatientList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                outpatientListService,
                service -> service.getOutpatientList(from.toString(), to.toString())
        );
    }
}
