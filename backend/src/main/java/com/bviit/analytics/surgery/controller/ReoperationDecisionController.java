package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.surgery.dto.ReoperationDecisionRow;
import com.bviit.analytics.surgery.dto.ReoperationDecisionSaveRequest;
import com.bviit.analytics.surgery.service.ReoperationDecisionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 재수술 검토 판정 저장·조회.
 *
 *   GET /api/reoperation-decisions?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   PUT /api/reoperation-decisions              (batch upsert)
 *
 * 자동판정(RE_OPERATION 기반)과 별개로 담당자가 확정한 재수술 여부를 저장한다.
 * (chartNo, opDate) 유니크 — 있으면 갱신, 없으면 신규.
 */
@RestController
@RequestMapping("/api/reoperation-decisions")
@RequiredArgsConstructor
public class ReoperationDecisionController {

    private final ReoperationDecisionService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReoperationDecisionRow>>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.findRows(from, to)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<List<ReoperationDecisionRow>>> saveBatch(
            @Valid @RequestBody ReoperationDecisionSaveRequest request,
            Authentication authentication
    ) {
        String updatedBy = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(ApiResponse.ok(service.saveBatch(request, updatedBy)));
    }
}
