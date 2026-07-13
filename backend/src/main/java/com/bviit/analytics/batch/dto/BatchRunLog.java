package com.bviit.analytics.batch.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * batch_run_log 한 행. 잡 실행 시작 시 RUNNING 로 삽입 → 완료/실패 시 finish로 업데이트.
 *
 * tableStats: 어느 테이블에 몇 건 write 했는지의 breakdown. 성공 시에만 세팅되며,
 * 실패·진행중은 null. V17 이전 이력도 null.
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
        DAILY, MONTHLY_RECONCILE, MANUAL
    }

    public enum Status {
        RUNNING, SUCCESS, FAILED
    }
}
