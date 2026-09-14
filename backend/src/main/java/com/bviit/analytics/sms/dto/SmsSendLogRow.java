package com.bviit.analytics.sms.dto;

import com.bviit.analytics.sms.entity.SmsSendLog;
import lombok.Builder;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class SmsSendLogRow {

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final Long id;
    private final Long targetId;
    private final String templateCode;
    private final String templateLabel;
    private final String requestedChannel;
    private final String messageType;
    private final String solapiGroupId;
    private final String solapiMessageId;
    private final String statusCode;
    private final String status;
    private final String failReason;
    private final String sentAt;
    private final String sentBy;
    /** 단말 도달 시각 — 비면 미도달. */
    private final String deliveredAt;
    /** 알림톡 → 문자 대체발송 여부. */
    private final boolean replacement;

    public static SmsSendLogRow from(SmsSendLog log) {
        return SmsSendLogRow.builder()
                .id(log.getId())
                .targetId(log.getTargetId())
                .templateCode(log.getTemplateCode())
                .templateLabel(log.getTemplateLabel())
                .requestedChannel(log.getRequestedChannel())
                .messageType(nz(log.getMessageType()))
                .solapiGroupId(nz(log.getSolapiGroupId()))
                .solapiMessageId(nz(log.getSolapiMessageId()))
                .statusCode(nz(log.getStatusCode()))
                .status(log.getStatus())
                .failReason(nz(log.getFailReason()))
                .sentAt(log.getSentAt() == null ? "" : TS.format(log.getSentAt()))
                .sentBy(nz(log.getSentBy()))
                .deliveredAt(log.getDeliveredAt() == null ? "" : TS.format(log.getDeliveredAt()))
                .replacement(log.isReplacement())
                .build();
    }

    private static String nz(String v) {
        return v == null ? "" : v;
    }
}
