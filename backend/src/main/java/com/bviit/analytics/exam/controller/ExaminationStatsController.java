package com.bviit.analytics.exam.controller;

import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.common.stats.StatsPanelSupport;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.service.ExaminationStatsReader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 검사 건수 통계 API.
 * 실 데이터 리더는 postgres-mart 프로파일에서 주입된다. 미연결 시 503으로 응답한다.
 * postgres-mart 프로파일에서는 ExaminationMartQueryService(@Primary)가 자동 선택돼 마트를 조회한다.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class ExaminationStatsController {

    private final Optional<ExaminationStatsReader> examinationService;

    /**
     * 연도별 월간 검사 유형별 건수 (프론트 ExaminationPage용).
     * GET /api/stats/examination/monthly?years=2025,2026
     *
     * 응답: { success: true, data: [{year, month, visionCorrection,
     *         dreamlens, cataract, examTotal, total}, ...] }
     */
    @GetMapping("/examination/monthly")
    public ResponseEntity<ApiResponse<List<ExaminationMonthlyItem>>> getMonthlyStats(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);

        return StatsPanelSupport.require(examinationService, service -> service.getMonthlyStats(years));
    }
}
