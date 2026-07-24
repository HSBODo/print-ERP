package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.exam.service.ExamCountService;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

/**
 * GET /api/stats/exam-count?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * 검사수(월간 레포트 c-exam-count 기준) 범위 집계 — EXAM 행수 + Cataract_Exam 세션수.
 * 전체 검사자 리스트의 "조회건수(사람)" 옆 참고 지표. 실 데이터 프로파일에서만 주입, 미연결 시 503.
 */
@RestController
@RequestMapping("/api/stats/exam-count")
@RequiredArgsConstructor
public class ExamCountController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ExamCountService> examCountService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExamCount(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                examCountService,
                service -> service.getExamCount(from.toString(), to.toString())
        );
    }
}
