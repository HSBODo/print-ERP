package com.bviit.analytics.event.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.dto.PageResponse;
import com.bviit.analytics.event.dto.EventNoteRequest;
import com.bviit.analytics.event.dto.EventNoteRow;
import com.bviit.analytics.event.service.EventNoteService;
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
 * 이벤트 노트 엔드포인트. 설계: docs/event-note/design.md
 *
 *   GET    /api/event/notes?from&to&page=0&size=20   관리 화면 페이징 목록 (from/to 생략 = 전체)
 *   GET    /api/event/notes/all?from&to              차트용 기간 전체 목록 (페이징 없음 · 최대 1,096일)
 *   GET    /api/event/notes/{id}
 *   POST   /api/event/notes
 *   PUT    /api/event/notes/{id}                     전체 필드 교체
 *   DELETE /api/event/notes/{id}                     소프트 삭제
 *
 * 권한(SecurityConfig): GET = 로그인 사용자 전원 · POST/PUT/DELETE = ADMIN · MEDICAL · MARKETING 부서.
 *
 * from/to 는 required=false 로 받는다 — 누락 판정·메시지는 서비스가 400(InvalidPeriodException)으로 준다.
 * (필수 파라미터 누락 예외는 GlobalExceptionHandler 에 매핑이 없어 500 으로 떨어진다.)
 */
@RestController
@RequestMapping("/api/event/notes")
@RequiredArgsConstructor
public class EventNoteController {

    private final EventNoteService service;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<EventNoteRow>>> page(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.findPage(from, to, page, size)));
    }

    /** 리터럴 경로라 /{id} 보다 먼저 매칭된다. */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<EventNoteRow>>> all(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAllForChart(from, to)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventNoteRow>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EventNoteRow>> create(@Valid @RequestBody EventNoteRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EventNoteRow>> update(
            @PathVariable Long id,
            @Valid @RequestBody EventNoteRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
