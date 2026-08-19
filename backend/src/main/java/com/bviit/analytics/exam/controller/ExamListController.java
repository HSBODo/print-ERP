package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.exam.service.ExamListReader;
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
 * GET /api/exam-list?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 검사자 리스트(상담사별) 행 목록. 응답: ApiResponse&lt;List&lt;Map&gt;&gt; (camelCase 키).
 * 실 데이터 리더는 postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 * postgres-mart 프로파일에서는 ExamListMartQueryService(@Primary)가 자동 선택돼 마트를 조회한다.
 */
@RestController
@RequestMapping("/api/exam-list")
@RequiredArgsConstructor
public class ExamListController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ExamListReader> examListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getExamList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                examListService,
                service -> service.getExamList(from.toString(), to.toString())
        );
    }
}
