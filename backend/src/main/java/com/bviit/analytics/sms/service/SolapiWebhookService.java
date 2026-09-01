package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.dto.SolapiMessageReportEvent;
import com.bviit.analytics.sms.entity.SmsSendLog;
import com.bviit.analytics.sms.repository.SmsSendLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 솔라피 웹훅(SINGLE-REPORT) 처리 — 이벤트를 받아 {@link SmsSendLog} 를 갱신한다.
 *
 * <h3>판정 규칙 (원본: {@link SolapiSyncService#applyTo})</h3>
 * 두 경로(웹훅·수동 sync)가 같은 규칙을 쓰지 않으면 같은 발송을 두고 상태가 갈릴 수 있다.
 * 그래서 여기 상수·분기 순서는 {@link SolapiSyncService} 와 <b>토씨까지 맞춘다</b>.
 * <ul>
 *   <li>{@code dateReceived} 있음 → SUCCESS + 도달시각 채움</li>
 *   <li>{@code statusCode} 비어 있거나 2000·3000 → 판단 보류 (다음 이벤트/sync 에서 다시 본다)</li>
 *   <li>{@code statusCode} == 4000 → SUCCESS (도달시각 없음 — 대체발송·일부 통신사에서 안 실려 온다)</li>
 *   <li>그 외 → FAILED</li>
 * </ul>
 *
 * <h3>대체발송 추정</h3>
 * 웹훅 payload 에는 {@code replacement} 플래그가 없어, 요청 채널이 알림톡(ALIMTALK)이고 응답
 * {@code type} 이 ATA 가 아니면 대체발송으로 본다(솔라피는 알림톡 실패 시 자동으로 문자로 대체).
 *
 * <h3>매칭 못 한 이벤트</h3>
 * 우리가 발송한 이력이 아닌 messageId 는 무시한다 — 다른 시스템에서 같은 계정을 쓰는 경우가
 * 있을 수 있고, 없어도 웹훅은 유효한 요청이므로 200 을 돌려주는 게 맞다(재시도 유발 금지).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SolapiWebhookService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    /** 아직 진행 중 — 실패로 굳히면 안 되는 코드. {@link SolapiSyncService} 와 동일. */
    private static final Set<String> IN_PROGRESS_CODES = Set.of("2000", "3000");
    /** 정상 처리 완료. 도달 시각이 안 실려 와도 실패는 아니다. */
    private static final String SUCCESS_CODE = "4000";
    /** 알림톡 요청 채널 값 — {@link SolapiSendService#CHANNEL_ALIMTALK} 와 같은 문자열. */
    private static final String CHANNEL_ALIMTALK = "ALIMTALK";
    /** 알림톡 응답 타입 — 이 값이 아니면 대체발송으로 본다. */
    private static final String TYPE_ALIMTALK = "ATA";

    private final SmsSendLogRepository logRepository;

    /** 갱신한 이력 수. 매칭 실패·판단 보류 건은 세지 않는다. */
    @Transactional
    public int applyMessageReports(List<SolapiMessageReportEvent> events) {
        if (events == null || events.isEmpty()) return 0;
        int updated = 0;
        int unmatched = 0;
        int deferred = 0;
        for (SolapiMessageReportEvent event : events) {
            if (event.messageId() == null || event.messageId().isBlank()) continue;
            Optional<SmsSendLog> opt = logRepository.findBySolapiMessageId(event.messageId());
            if (opt.isEmpty()) { unmatched++; continue; }
            if (apply(opt.get(), event)) updated++; else deferred++;
        }
        log.info("솔라피 웹훅 처리: 총 {}건 · 갱신 {}건 · 미매칭 {}건 · 보류 {}건",
                events.size(), updated, unmatched, deferred);
        return updated;
    }

    /** 반영했으면 true — 아직 결과가 안 나온 건은 건드리지 않는다(다음 이벤트/sync 에서 다시 본다). */
    private boolean apply(SmsSendLog log, SolapiMessageReportEvent event) {
        LocalDateTime deliveredAt = parseDateTime(event.dateReceived());
        String statusCode = event.statusCode();
        String type = event.type();
        boolean replacement = CHANNEL_ALIMTALK.equals(log.getRequestedChannel())
                && type != null && !TYPE_ALIMTALK.equals(type);

        if (deliveredAt != null) {
            log.applyDeliveryResult(type, statusCode, SmsSendLog.STATUS_SUCCESS,
                    deliveredAt, replacement, null);
            return true;
        }
        if (statusCode == null || statusCode.isBlank() || IN_PROGRESS_CODES.contains(statusCode)) {
            return false;
        }
        if (SUCCESS_CODE.equals(statusCode)) {
            log.applyDeliveryResult(type, statusCode, SmsSendLog.STATUS_SUCCESS,
                    null, replacement, null);
            return true;
        }
        String reason = "도달 실패 (상태코드 " + statusCode
                + (event.statusMessage() != null && !event.statusMessage().isBlank()
                        ? " · " + event.statusMessage() : "")
                + ")";
        log.applyDeliveryResult(type, statusCode, SmsSendLog.STATUS_FAILED,
                null, replacement, reason);
        return true;
    }

    /** 솔라피 시각은 ISO-8601(오프셋 포함). 형식이 달라도 죽지 않게 단계별로 시도. */
    private static LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return OffsetDateTime.parse(raw).atZoneSameInstant(SEOUL).toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(raw);
            } catch (Exception e) {
                log.warn("웹훅 도달시각 파싱 실패: {}", raw);
                return null;
            }
        }
    }
}
