package com.bviit.analytics.batch.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * batch_run_log 한 행. 잡 실행 시작 시 RUNNING 로 삽입 → 완료/실패 시 finish로 업데이트.
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
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        Long durationMs,
        String errorMessage
) {
    public enum RunType {
        DAILY, MONTHLY_RECONCILE, MANUAL
    }

    public enum Status {
        RUNNING, SUCCESS, FAILED
    }
}
