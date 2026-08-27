package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.surgery.dto.AccumulatedEyeRow;
import com.bviit.analytics.surgery.service.AccumulatedEyeReader;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * GET /api/accumulated-eyes?from=YYYY-MM-DD&to=YYYY-MM-DD&query=
 * 누적 안수 리스트. 기준일은 operation_date. 마트 미연결(비-mart 프로파일) 시 503.
 */
@RestController
@RequestMapping("/api/accumulated-eyes")
@RequiredArgsConstructor
public class AccumulatedEyeController {

    /**
     * 검색어 없는 무필터 조회는 결과가 대량이 되기 쉬워 1년(366일)으로 제한.
     * 검색어(이름·차트·전화)가 있으면 개인 시술 이력 성격이라 10년(3,660일)까지 허용한다.
     * — 결과 폭이 자연히 좁혀지므로 응답·직렬화 부담이 낮다.
     */
    private static final int MAX_RANGE_DAYS_NO_QUERY   = 366;
    private static final int MAX_RANGE_DAYS_WITH_QUERY = 3660;

    private final Optional<AccumulatedEyeReader> reader;

    /** 허용 검색 필드 — SQL 의 :field 대응. 그 외 값은 'all' 로 클램프. */
    private static final Set<String> ALLOWED_FIELDS = Set.of("all", "name", "chart", "phone", "eyes");

    @GetMapping
    public ResponseEntity<ApiResponse<List<AccumulatedEyeRow>>> getAccumulatedEyes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false, defaultValue = "all") String field
    ) {
        int maxDays = query != null && !query.trim().isEmpty()
                ? MAX_RANGE_DAYS_WITH_QUERY
                : MAX_RANGE_DAYS_NO_QUERY;
        StatsRequestValidator.validateDateRange(from, to, maxDays);
        String safeField = ALLOWED_FIELDS.contains(field) ? field : "all";
        return StatsPanelSupport.require(
                reader,
                svc -> svc.getAccumulatedEyes(from.toString(), to.toString(), query, safeField)
        );
    }
}
