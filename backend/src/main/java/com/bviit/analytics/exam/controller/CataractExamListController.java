package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.exam.service.CataractExamListReader;
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
 * GET /api/cataract-exam-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 백내장 검사자 리스트 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키, 검사자 리스트와 동일 계약).
 * 실 데이터 리더는 postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 * postgres-mart 프로파일에서는 CataractExamListMartQueryService(@Primary)가 자동 선택돼 마트를 조회한다.
 */
@RestController
@RequestMapping("/api/cataract-exam-list")
@RequiredArgsConstructor
public class CataractExamListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<CataractExamListReader> cataractExamListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCataractExamList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                cataractExamListService,
                service -> service.getCataractExamList(from.toString(), to.toString())
        );
    }
}
