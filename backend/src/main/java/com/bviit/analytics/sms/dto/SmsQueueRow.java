package com.bviit.analytics.sms.dto;

import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/** 큐 상태 조회용 응답 행 — 관리자 화면 큐 상태 카드·실패 재실행 모달에서 쓴다. */
@Getter
@Builder
public class SmsQueueRow {

    private final Long id;
    private final Long targetId;
    private final String templateCode;
    private final LocalDateTime scheduledAt;
    private final String kind;
    private final String status;
    private final int attemptCount;
    private final String lastError;
    private final LocalDateTime pickedAt;
    private final LocalDateTime processedAt;

    public static SmsQueueRow from(SmsDispatchQueue row) {
        return SmsQueueRow.builder()
                .id(row.getId())
                .targetId(row.getTargetId())
                .templateCode(row.getTemplateCode())
                .scheduledAt(row.getScheduledAt())
                .kind(row.getKind())
                .status(row.getStatus())
                .attemptCount(row.getAttemptCount())
                .lastError(row.getLastError())
                .pickedAt(row.getPickedAt())
                .processedAt(row.getProcessedAt())
                .build();
    }
}
