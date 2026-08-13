package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.surgery.service.ReoperationCandidateReader;

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
 * GET /api/stats/surgery/reoperation-candidates?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * 재수술 후보(RE_OPERATION 원본 행 + 자동판정·제외사유) 목록 — 담당자 검토/보정용 읽기 전용.
 * 자동 집계(월간 레포트 재수술 건수)의 포함/제외를 행 단위로 확인하기 위한 조회 API.
 * postgres-mart 프로파일에서는 list_reoperation 마트에서 읽어 MSSQL 왕복이 없다.
 * 미연결 시 503.
 */
@RestController
@RequestMapping("/api/stats/surgery")
@RequiredArgsConstructor
public class ReoperationCandidateController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ReoperationCandidateReader> reoperationCandidateService;

    @GetMapping("/reoperation-candidates")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReoperationCandidates(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                reoperationCandidateService,
                service -> service.getCandidates(from.toString(), to.toString())
        );
    }
}
