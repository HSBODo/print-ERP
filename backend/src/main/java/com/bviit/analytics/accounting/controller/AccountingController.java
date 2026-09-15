package com.bviit.analytics.accounting.controller;

import com.bviit.analytics.accounting.dto.AccountingStatus;
import com.bviit.analytics.accounting.dto.MedicalMonthlyPoint;
import com.bviit.analytics.accounting.dto.VisionMonthlyPoint;
import com.bviit.analytics.accounting.service.AccountingReader;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
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
 * 회계 API — 마트 조회 전용 (ADMIN · SecurityConfig).
 *
 * <pre>
 * GET /api/accounting/medical-receipts?from&to                 진료 수납 내역 (의사랑 · 수납일 범위 · 최대 366일)
 * GET /api/accounting/medical-receipts/monthly?years&category  진료 매출 월별 (전체/외래/입원/백내장)
 * GET /api/accounting/vision-receipts?from&to                  시력교정 매출 내역 (SOFTCRM 비급여 · 집계 화면도 이 행을 접는다)
 * GET /api/accounting/vision-receipts/monthly?years            시력교정 매출 월별
 * GET /api/accounting/status                                   적재 현황 (데이터 기준일 표기)
 * </pre>
 * 마트 미연결(local 단독 프로파일)이면 503.
 */
@RestController
@RequestMapping("/api/accounting")
@RequiredArgsConstructor
public class AccountingController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<AccountingReader> reader;

    @GetMapping("/medical-receipts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMedicalReceipts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(reader, s -> s.getMedicalReceipts(from.toString(), to.toString()));
    }

    @GetMapping("/medical-receipts/monthly")
    public ResponseEntity<ApiResponse<List<MedicalMonthlyPoint>>> getMedicalMonthly(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "전체") String category
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(reader, s -> s.getMedicalMonthly(years, category));
    }

    @GetMapping("/vision-receipts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getVisionReceipts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(reader, s -> s.getVisionReceipts(from.toString(), to.toString()));
    }

    @GetMapping("/vision-receipts/monthly")
    public ResponseEntity<ApiResponse<List<VisionMonthlyPoint>>> getVisionMonthly(
            @RequestParam List<Integer> years
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(reader, s -> s.getVisionMonthly(years));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<AccountingStatus>> getStatus() {
        return StatsPanelSupport.require(reader, AccountingReader::getStatus);
    }
}
