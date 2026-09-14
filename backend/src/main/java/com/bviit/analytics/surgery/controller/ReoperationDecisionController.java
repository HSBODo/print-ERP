package com.bviit.analytics.surgery.controller;

import com.bviit.analytics.batch.admin.ReoperationMartRefresher;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.surgery.dto.ReoperationDecisionRow;
import com.bviit.analytics.surgery.dto.ReoperationDecisionSaveRequest;
import com.bviit.analytics.surgery.service.ReoperationDecisionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
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
import java.util.Comparator;
import java.util.List;

/**
 * 재수술 검토 판정 저장·조회.
 *
 *   GET /api/reoperation-decisions?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   PUT /api/reoperation-decisions              (batch upsert)
 *
 * 자동판정(RE_OPERATION 기반)과 별개로 담당자가 확정한 재수술 여부를 저장한다.
 * (chartNo, opDate) 유니크 — 있으면 갱신, 없으면 신규.
 *
 * 저장 성공 시 영향 받은 opDate 범위에 대해 surgery 마트를 즉시 재빌드 —
 * `/stats/surgery-composition` 등 마트 조회 화면이 다음 스케줄 배치를 기다리지
 * 않고 판정 변경을 반영하도록 한다. 마트 프로필 밖(H2/MSSQL 직결)에서는 빈이
 * 존재하지 않아 자동 no-op.
 */
@RestController
@RequestMapping("/api/reoperation-decisions")
@RequiredArgsConstructor
public class ReoperationDecisionController {

    private final ReoperationDecisionService service;
    private final ObjectProvider<ReoperationMartRefresher> martRefresher;

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
        List<ReoperationDecisionRow> saved = service.saveBatch(request, updatedBy);
        refreshMart(saved);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    private void refreshMart(List<ReoperationDecisionRow> saved) {
        if (saved.isEmpty()) return;
        LocalDate from = saved.stream().map(ReoperationDecisionRow::getOpDate)
                .min(Comparator.naturalOrder()).orElseThrow();
        LocalDate to = saved.stream().map(ReoperationDecisionRow::getOpDate)
                .max(Comparator.naturalOrder()).orElseThrow();
        martRefresher.ifAvailable(r -> r.refresh(from, to));
    }
}
