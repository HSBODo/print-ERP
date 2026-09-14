package com.bviit.analytics.batch.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 마지막으로 성공한 DAILY 배치 정보.
 * targetDate = target_to (D-1 커버 날짜), finishedAt = 배치 완료 시각.
 */
public record BatchLastSuccessResponse(
        LocalDate targetDate,
        LocalDateTime finishedAt
) {}
