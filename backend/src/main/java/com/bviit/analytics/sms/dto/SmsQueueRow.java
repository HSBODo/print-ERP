package com.bviit.analytics.sms.dto;

import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import com.bviit.analytics.sms.entity.SmsTarget;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
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

    // 재실행 모달 컬럼 — target 조인 결과. 대상이 삭제된 옛 큐면 null.
    private final String chartNo;
    private final String name;
    private final String phone;
    private final LocalDate surgeryDate;

    public static SmsQueueRow from(SmsDispatchQueue row) {
        return from(row, null);
    }

    public static SmsQueueRow from(SmsDispatchQueue row, SmsTarget target) {
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
                .chartNo(target == null ? null : target.getChartNo())
                .name(target == null ? null : target.getName())
                .phone(target == null ? null : target.getPhone())
                .surgeryDate(target == null ? null : target.getSurgeryDate())
                .build();
    }
}
