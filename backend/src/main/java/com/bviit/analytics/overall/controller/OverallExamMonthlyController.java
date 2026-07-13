package com.bviit.analytics.overall.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.service.OverallExamMonthlyReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 검사자 종합표 월간 집계 API.
 * 실 데이터 리더는 mssql·postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 * postgres-mart 프로파일에서는 OverallExamMonthlyMartQueryService(@Primary)가 자동 선택돼 마트를 조회한다.
 *
 * 24·25 는 V14+V16 마트 시드가 SSOT — API 는 요청된 연도에 대해 마트에 있는 데이터를 그대로 반환한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class OverallExamMonthlyController {

    private final Optional<OverallExamMonthlyReader> overallExamMonthlyService;

    /**
     * 연도별 월간 검사자 종합지표 (프론트 월별 검사자 종합지표 페이지용).
     * GET /api/stats/overall-exam/monthly?years=2026
     *
     * 응답: { success: true, data: [{year, month, partial, ...원시 집계}, ...] }
     */
    @GetMapping("/overall-exam/monthly")
    public ResponseEntity<ApiResponse<List<OverallExamMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.require(overallExamMonthlyService, service -> service.getMonthlyStats(years));
    }
}
