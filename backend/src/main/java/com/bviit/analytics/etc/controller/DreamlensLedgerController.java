package com.bviit.analytics.etc.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.etc.dto.DreamlensLedgerRequest;
import com.bviit.analytics.etc.dto.DreamlensLedgerRow;
import com.bviit.analytics.etc.service.DreamlensLedgerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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

/**
 * 드림렌즈 장부 CRUD 엔드포인트.
 *
 *   GET    /api/dreamlens-ledger?from=2026-07-01&to=2026-08-31
 *   POST   /api/dreamlens-ledger
 *   PUT    /api/dreamlens-ledger/{id}
 *   DELETE /api/dreamlens-ledger/{id}
 */
@RestController
@RequestMapping("/api/dreamlens-ledger")
@RequiredArgsConstructor
public class DreamlensLedgerController {

    private final DreamlensLedgerService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DreamlensLedgerRow>>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.findRows(from, to)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DreamlensLedgerRow>> create(
            @Valid @RequestBody DreamlensLedgerRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DreamlensLedgerRow>> update(
            @PathVariable Long id,
            @Valid @RequestBody DreamlensLedgerRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
