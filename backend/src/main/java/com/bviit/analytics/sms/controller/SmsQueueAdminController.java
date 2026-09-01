package com.bviit.analytics.sms.controller;

import com.bviit.analytics.batch.job.SmsDispatchJob;
import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.sms.dto.SmsQueueRow;
import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import com.bviit.analytics.sms.service.SmsDispatchQueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 자동 발송 큐(sms_dispatch_queue) 관리자 API — /api/admin/** 매처가 hasRole('ADMIN').
 *
 * <ul>
 *   <li>GET  /status  — 상태별 카운트 + 오늘 처리량 KPI</li>
 *   <li>GET  /rows?status=&limit=&from=&to=  — 상태 행 목록. from/to 는 scheduled_at 기준 YYYY-MM-DD.</li>
 *   <li>POST /retry?ids=1,2,3 — FAILED/CANCELED 를 PENDING 으로 리셋(attempt_count 도 0)</li>
 *   <li>POST /run — 5분 폴러를 즉시 한 번 실행 (테스트·긴급용)</li>
 * </ul>
 *
 * <p>{@code postgres-mart} 프로파일 전용 — 큐 테이블은 마트 환경에만 있다.
 * 로컬(H2)에서도 JPA ddl-auto=update 로 표는 생기지만, 관리자 액션은 마트 활성 환경에서만.
 */
@RestController
@RequestMapping("/api/admin/batch/sms/queue")
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SmsQueueAdminController {

    private final SmsDispatchQueueService queueService;
    private final SmsDispatchJob dispatchJob;

    /** 큐 상태 요약 KPI — 화면 상단 카드. */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        Map<String, Long> counts = queueService.statusCounts();
        long doneToday = queueService.countDoneToday();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "counts", counts,
                "done_today", doneToday
        )));
    }

    /**
     * 상태별 큐 행 조회 — 기본 FAILED 100건.
     *
     * <p>limit 은 1..500 로 캡, 지정 없으면 100.
     * from/to 는 scheduled_at 기준(YYYY-MM-DD, to 는 exclusive). null 이면 전체.
     * 예: {@code ?status=RECEIVED&from=2026-09-01&to=2026-09-08} — 9/1..9/7 예정된 RECEIVED 만.
     */
    @GetMapping("/rows")
    public ResponseEntity<ApiResponse<List<SmsQueueRow>>> rows(
            @RequestParam(required = false, defaultValue = "FAILED") String status,
            @RequestParam(required = false, defaultValue = "100") int limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        int cappedLimit = Math.min(Math.max(limit, 1), 500);
        LocalDateTime fromDt = from == null ? null : from.atStartOfDay();
        LocalDateTime toDt = to == null ? null : to.atStartOfDay();
        List<SmsQueueRow> rows = queueService
                .findByStatus(status.toUpperCase(), cappedLimit, fromDt, toDt).stream()
                .map(SmsQueueRow::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }

    /**
     * 실패·취소 행 재실행 — attempt_count 를 0 으로 리셋해 PENDING 으로 돌린다.
     * {@code ids} 는 쉼표 구분 (예: {@code ?ids=1,2,3}). 없으면 아무 것도 안 함.
     */
    @PostMapping("/retry")
    public ResponseEntity<ApiResponse<Integer>> retry(@RequestParam(required = false) List<Long> ids) {
        int reset = queueService.retryRows(ids == null ? List.of() : ids);
        return ResponseEntity.ok(ApiResponse.ok(reset));
    }

    /**
     * 5분 폴러 즉시 실행 — 개발·긴급용. 배치 이력에도 남는다.
     * enabled=false 여도 이 엔드포인트는 실행한다 (관리자 명시적 트리거).
     */
    @PostMapping("/run")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> runNow() {
        Map<String, Integer> stats = dispatchJob.run();
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    /** enum 상수 노출 — 프론트가 상태 목록을 하드코딩하지 않아도 되게 도와주는 helper. */
    @GetMapping("/statuses")
    public ResponseEntity<ApiResponse<List<String>>> statuses() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                SmsDispatchQueue.STATUS_PENDING,
                SmsDispatchQueue.STATUS_PROCESSING,
                SmsDispatchQueue.STATUS_RECEIVED,
                SmsDispatchQueue.STATUS_DONE,
                SmsDispatchQueue.STATUS_FAILED,
                SmsDispatchQueue.STATUS_CANCELED
        )));
    }
}
