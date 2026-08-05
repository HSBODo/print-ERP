package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.exam.service.ExamCountReader;

import lombok.RequiredArgsConstructor;
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
 * GET /api/stats/exam-count/by-class?year=2026
 *
 * 고객분류별 검사수(월간 레포트 도표 #7) — (month·motiveReport·cnt) 행 목록.
 * 세션(EXAM 행 + Cataract_Exam 행) 기준이라 월 합계가 '검사수' 도표(라이브 구간)와 일치한다.
 * 24·25 는 이 분류가 확정되기 전이라 레거시 확정값에 없다. 당해연도만 조회한다.
 * 실 데이터 프로파일에서만 주입, 미연결 시 503.
 *
 * postgres-mart 에서는 마트 read 구현이 @Primary 로 선택돼 MSSQL 가용성과 무관하게 응답한다.
 */
@RestController
@RequestMapping("/api/stats/exam-count")
@RequiredArgsConstructor
public class ExamCountController {

    private final Optional<ExamCountReader> examCountService;

    @GetMapping("/by-class")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getExamCountByClass(
            @RequestParam int year
    ) {
        StatsRequestValidator.validateYears(List.of(year));
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        return StatsPanelSupport.require(
                examCountService,
                service -> service.getExamCountByClassMonthly(from.toString(), to.toString())
        );
    }
}
