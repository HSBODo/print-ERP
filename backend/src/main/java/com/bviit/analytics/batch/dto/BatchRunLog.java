package com.bviit.analytics.batch.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * batch_run_log 한 행. 잡 실행 시작 시 RUNNING 로 삽입 → 완료/실패 시 finish로 업데이트.
 *
 * tableStats: 테이블별 적재 건수. 회계 부분 실패 시에도 완료된 적재와 실패 표시를 보존한다.
 * 그 외 실패·진행중 및 V17 이전 이력은 null일 수 있다.
 */
@Builder
public record BatchRunLog(
        Long id,
        String jobName,
        RunType runType,
        LocalDate targetFrom,
        LocalDate targetTo,
        Status status,
        int rowsUpserted,
        Map<String, Integer> tableStats,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        Long durationMs,
        String errorMessage
) {
    public enum RunType {
        /** 매일 새벽 D-1 마트 적재 (03:00 · 예약통계 10:00). */
        DAILY,
        /** 매월 1일 03:30 전월 소급 재계산 (원데이 검사 소급 보정 포함). */
        MONTHLY_RECONCILE,
        /** 관리자 UI · Admin API 에서 사람이 명시적으로 트리거한 실행 (backfill·재실행·[지금 실행]). */
        MANUAL,
        /** 시스템 폴러 자동 실행 — 예: SmsDispatchJob 5분, SmsResultSyncJob 매일 03:30 자동 사이클. */
        POLLER
    }

    public enum Status {
        RUNNING, SUCCESS, FAILED
    }
}
