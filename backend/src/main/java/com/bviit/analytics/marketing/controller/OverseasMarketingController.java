package com.bviit.analytics.marketing.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionQuery;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionUpsertRequest;
import com.bviit.analytics.marketing.dto.OverseasMarketingStatisticsResult;
import com.bviit.analytics.marketing.dto.OverseasMarketingSyncResult;
import com.bviit.analytics.marketing.service.OverseasMarketingEditor;
import com.bviit.analytics.marketing.service.OverseasMarketingReader;
import com.bviit.analytics.marketing.service.OverseasMarketingSyncer;
import com.bviit.analytics.marketing.service.OverseasReservationStatsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/overseas-marketing")
@RequiredArgsConstructor
public class OverseasMarketingController {

    private static final Set<String> DATE_TYPES = Set.of(
            "reg_date", "matched_date", "inquiry_date", "departure_schedule",
            "exam_date", "surgery_date"
    );
    private static final Set<String> SOURCES = Set.of("all", "manual", "existing");
    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<OverseasMarketingReader> overseasMarketingReader;
    private final Optional<OverseasMarketingSyncer> overseasMarketingSyncer;
    private final Optional<OverseasMarketingEditor> overseasMarketingEditor;
    private final Optional<OverseasReservationStatsService> reservationStatsService;

    /** 예약통계 — 레거시 시드(~8/23)와 접수리스트 자동 집계(8/24~)를 병합해 반환한다. */
    @GetMapping("/reservation-stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReservationStats(
            @RequestParam int year,
            @RequestParam(defaultValue = "month") String granularity
    ) {
        if (year < 2020 || year > 2100) {
            throw new IllegalArgumentException("지원하지 않는 연도입니다: " + year);
        }
        if (!GRANULARITIES.contains(granularity)) {
            throw new IllegalArgumentException("지원하지 않는 집계 단위입니다: " + granularity);
        }
        return StatsPanelSupport.require(reservationStatsService,
                service -> service.getStats(year, granularity));
    }

    /** 예약통계 일별 셀 수동 수정 — 저장 즉시 자동 집계·시드보다 우선한다. */
    @PutMapping("/reservation-stats/{date}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateReservationStat(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        String groupKey = String.valueOf(request.getOrDefault("groupKey", "")).trim();
        String metricKey = String.valueOf(request.getOrDefault("metricKey", "")).trim();
        Object rawValue = request.get("value");
        if (!(rawValue instanceof Number number)) {
            throw new IllegalArgumentException("값은 숫자여야 합니다.");
        }
        String actor = actor(authentication);
        return StatsPanelSupport.require(reservationStatsService,
                service -> service.updateCell(date, groupKey, metricKey, number.intValue(), actor));
    }

    @GetMapping("/receptions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReceptions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "reg_date") String dateType,
            @RequestParam(defaultValue = "true") boolean dateEnabled,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "all") String source,
            @RequestParam(defaultValue = "false") boolean unmatched
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        if (!DATE_TYPES.contains(dateType)) {
            throw new IllegalArgumentException("지원하지 않는 날짜 기준입니다: " + dateType);
        }
        if (!SOURCES.contains(source)) {
            throw new IllegalArgumentException("지원하지 않는 명단 구분입니다: " + source);
        }
        OverseasMarketingReceptionQuery query = new OverseasMarketingReceptionQuery(
                from.toString(), to.toString(), dateType, dateEnabled, status.trim(), source, unmatched);
        return StatsPanelSupport.require(overseasMarketingReader, reader -> reader.getReceptions(query));
    }

    private static final Set<String> GRANULARITIES = Set.of("month", "week", "day");

    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<OverseasMarketingStatisticsResult>> getStatistics(
            @RequestParam int year,
            @RequestParam(defaultValue = "month") String granularity
    ) {
        StatsRequestValidator.validateYears(List.of(year));
        if (!GRANULARITIES.contains(granularity)) {
            throw new IllegalArgumentException("지원하지 않는 집계 단위입니다: " + granularity);
        }
        return StatsPanelSupport.require(overseasMarketingReader, reader -> reader.getStatistics(year, granularity));
    }

    @PostMapping("/sync-sheet")
    public ResponseEntity<ApiResponse<OverseasMarketingSyncResult>> syncSheet() {
        return StatsPanelSupport.require(overseasMarketingSyncer, OverseasMarketingSyncer::syncSheet);
    }

    /** CRM 동기화 백그라운드 잡 시작 — 이미 실행 중이면 시작 없이 현재 상태를 반환한다(단일 실행 락). */
    @PostMapping("/sync-crm")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncCrm() {
        return StatsPanelSupport.require(overseasMarketingReader, OverseasMarketingReader::syncCrm);
    }

    /** CRM 동기화 잡 상태 폴링 — idle / running(단계) / done(결과) / error(사유). */
    @GetMapping("/sync-crm/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncCrmStatus() {
        return StatsPanelSupport.require(overseasMarketingReader, OverseasMarketingReader::syncCrmStatus);
    }

    /** CRM 고객번호 단건 미리보기 — 수동 매칭 팝업에서 번호 검증용. */
    @GetMapping("/crm-customers/{customerNo}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCrmCustomer(@PathVariable String customerNo) {
        if (customerNo.isBlank() || !customerNo.matches("[0-9]{1,20}")) {
            throw new IllegalArgumentException("고객번호는 숫자만 입력할 수 있습니다.");
        }
        return StatsPanelSupport.require(overseasMarketingReader, reader -> {
            Map<String, Object> customer = reader.findCrmCustomer(customerNo);
            if (customer == null) {
                throw new IllegalArgumentException("CRM에 존재하지 않는 고객번호입니다: " + customerNo);
            }
            return customer;
        });
    }

    /** 담당자 수동 매칭 확정(확인필요 확정·접수 행 직접 입력 겸용). */
    @PutMapping("/receptions/{rowNumber}/match")
    public ResponseEntity<ApiResponse<Map<String, Object>>> confirmMatch(
            @PathVariable long rowNumber,
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        String customerNo = request.getOrDefault("customerNo", "").trim();
        if (customerNo.isBlank() || !customerNo.matches("[0-9]{1,20}")) {
            throw new IllegalArgumentException("고객번호는 숫자만 입력할 수 있습니다.");
        }
        String actor = actor(authentication);
        return StatsPanelSupport.require(overseasMarketingReader,
                reader -> reader.confirmMatch(rowNumber, customerNo, actor));
    }

    /** 시트 동기화 버튼 노출 여부 — OVERSEAS_GOOGLE_SHEETS_SYNC_ENABLED 로 끄면 화면에서 숨긴다. */
    @GetMapping("/sync-availability")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getSyncAvailability() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("enabled", overseasMarketingSyncer.isPresent())));
    }

    @PostMapping("/receptions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createReception(
            @Valid @RequestBody OverseasMarketingReceptionUpsertRequest request,
            Authentication authentication
    ) {
        String actor = actor(authentication);
        return StatsPanelSupport.require(overseasMarketingEditor,
                editor -> Map.of("rowNumber", editor.createRow(request, actor)));
    }

    @PutMapping("/receptions/{rowNumber}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateReception(
            @PathVariable long rowNumber,
            @Valid @RequestBody OverseasMarketingReceptionUpsertRequest request,
            Authentication authentication
    ) {
        String actor = actor(authentication);
        return StatsPanelSupport.require(overseasMarketingEditor, editor -> {
            editor.updateRow(rowNumber, request, actor);
            return Map.of("rowNumber", rowNumber);
        });
    }

    @DeleteMapping("/receptions/{rowNumber}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteReception(@PathVariable long rowNumber) {
        return StatsPanelSupport.require(overseasMarketingEditor, editor -> {
            editor.deleteRow(rowNumber);
            return Map.of("rowNumber", rowNumber);
        });
    }

    private static String actor(Authentication authentication) {
        return authentication == null ? "system" : authentication.getName();
    }
}
