package com.bviit.analytics.sms.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.entity.SmsSendLog;
import com.bviit.analytics.sms.repository.SmsSendLogRepository;
import com.solapi.sdk.SolapiClient;
import com.solapi.sdk.message.dto.request.MessageListRequest;
import com.solapi.sdk.message.dto.response.MessageListResponse;
import com.solapi.sdk.message.model.Message;
import com.solapi.sdk.message.service.DefaultMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 발송 결과 동기화 — 솔라피 메시지 조회(getMessageList)로 **접수 이후**의 진짜 결과를 채운다.
 *
 * 접수 응답만으로는 "폰에 도착했는지"를 알 수 없다. 이 서비스가 messageId 로 다시 물어
 *   발송상태(완료/실패) · 도달시각(dateReceived) · 대체발송(replacement) · 실제 타입
 * 을 이력에 반영한다. <b>화면에는 버튼이 없다</b> — 자동화(큐)가 부를 자리이고, 지금은 API 만 있다.
 *
 * 도달 판정: dateReceived 가 있으면 완료 · 상태코드 4000 도 완료(도달시각이 안 실려 오기도 한다) ·
 * 2000·3000·코드 없음이면 판단 보류 · 그 외 코드는 실패.
 * 여기에 더해 매번 <b>고착 복구</b>를 먼저 돌린다(접수 응답을 못 받은 채 굳은 PENDING 정리).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SolapiSyncService {

    /** 한 번에 물어보는 messageId 수 — 조회 API 의 limit 과 맞춘다. */
    private static final int CHUNK = 50;
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    /** 접수 응답을 이만큼 못 받으면 사고로 본다 — 정상 발송은 몇 초면 끝난다. */
    private static final int STUCK_MINUTES = 10;

    private final SmsSendLogRepository logRepository;
    private final SolapiProperties props;
    private final SmsDispatchQueueService queueService;

    /**
     * fallback 스케줄러 — 웹훅 유실·비활성 대비. 하루 1회 최근 2일 재확인한다.
     *
     * <p>정상 흐름은 {@link com.bviit.analytics.sms.controller.SmsWebhookController} 가 SINGLE-REPORT
     * 이벤트를 받아 즉시 반영한다. 웹훅이 8회 실패 후 자동 INACTIVE 되거나 개별 이벤트가 유실되면
     * 로그가 영영 PENDING 으로 남는데, 이 배치가 걷어낸다. 웹훅이 정상이면 갱신 0건이 정상이다.
     *
     * <p>{@code SOLAPI_SYNC_CRON="-"} 로 스케줄을 아예 끌 수 있다. 솔라피 미설정이면 조용히 skip
     * — 스케줄러가 계속 붙어 있어도 API 호출은 안 하고 로그만 남는다.
     */
    @Scheduled(cron = "${solapi.sync-cron:0 30 3 * * *}", zone = "Asia/Seoul")
    public void runScheduledFallback() {
        if (!props.isConfigured()) {
            log.debug("SolapiSyncService fallback skip — 솔라피 미설정");
            return;
        }
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(2);
        try {
            int updated = sync(from, to);
            log.info("[fallback] 솔라피 동기화 완료: 갱신 {}건 (범위 {}..{})", updated, from, to);
        } catch (Exception e) {
            log.warn("[fallback] 솔라피 동기화 실패 (범위 {}..{})", from, to, e);
        }
    }

    /**
     * 갱신한 이력 수. 아직 도달 확인이 안 된 건은 그대로 둔다.
     * ⚠️ from/to 는 **발송 시각(sentAt)** 기준이다 — 수술일 범위가 아니다.
     */
    @Transactional
    public int sync(LocalDate from, LocalDate to) {
        if (!props.isConfigured()) {
            throw new DataSourceUnavailableException(
                    "솔라피 API 키가 설정되지 않아 발송 결과를 조회할 수 없습니다.");
        }
        int updated = recoverStuck();

        List<SmsSendLog> pending = logRepository
                .findByStatusAndSolapiMessageIdIsNotNullAndSentAtGreaterThanEqualAndSentAtLessThanOrderBySentAtDesc(
                        SmsSendLog.STATUS_PENDING, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        if (pending.isEmpty()) return updated;

        DefaultMessageService service =
                SolapiClient.INSTANCE.createInstance(props.getApiKey(), props.getApiSecret());

        for (int start = 0; start < pending.size(); start += CHUNK) {
            List<SmsSendLog> chunk = pending.subList(start, Math.min(start + CHUNK, pending.size()));
            Map<String, Message> found = fetch(service, chunk);
            for (SmsSendLog entry : chunk) {
                Message message = found.get(entry.getSolapiMessageId());
                if (message == null) continue;
                if (applyTo(entry, message)) updated++;
            }
        }
        log.info("발송 결과 동기화: range={}..{}, 대상={}건, 갱신={}건", from, to, pending.size(), updated);
        return updated;
    }

    /**
     * 접수 결과를 못 받고 남은 건을 실패로 떨어뜨린다 — <b>고착 복구</b>.
     *
     * 발송은 (의도 저장 → 전송 → 결과 기록) 순서라, 전송 직후 프로세스가 죽거나 결과 기록이
     * 실패하면 <b>메시지 ID 없는 PENDING</b> 이 남는다. 이 행은 조회 키가 없어 동기화 대상에서도
     * 빠지고, 멱등키가 <code>status &lt;&gt; 'FAILED'</code> 라 재발송까지 막는다 — 그 사람은 영영 못 받는다.
     *
     * 정상 발송은 몇 초면 끝나므로 {@link #STUCK_MINUTES}분이 지나도 접수 응답이 없으면 사고로 본다.
     * FAILED 로 바꾸면 멱등키가 풀려 다음 발송에서 다시 시도된다.
     *
     * ⚠️ 실제로 나갔는데 기록만 실패한 경우도 여기 걸려 <b>중복 발송이 될 수 있다</b>.
     *    그래도 "안 보낸 채로 영영 묻히는 것"보다 낫다고 보고 이쪽을 택했다. 실패 사유에
     *    그 사실을 적어 두어 사람이 이력을 보면 알 수 있게 한다.
     */
    private int recoverStuck() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(STUCK_MINUTES);
        List<SmsSendLog> stuck = logRepository
                .findByStatusAndSentAtLessThan(SmsSendLog.STATUS_PENDING, cutoff).stream()
                .filter(entry -> entry.getSolapiMessageId() == null || entry.getSolapiMessageId().isBlank())
                .toList();
        for (SmsSendLog entry : stuck) {
            entry.applyDeliveryResult(null, null, SmsSendLog.STATUS_FAILED, null, false,
                    "접수 응답을 받지 못한 채 " + STUCK_MINUTES + "분이 지나 실패로 정리했습니다"
                            + " (실제로 발송됐을 수 있으니 이력을 확인하세요).");
        }
        if (!stuck.isEmpty()) log.warn("접수 미확인 발송 {}건을 실패로 정리했습니다.", stuck.size());
        return stuck.size();
    }

    private Map<String, Message> fetch(DefaultMessageService service, List<SmsSendLog> chunk) {
        try {
            MessageListRequest request = new MessageListRequest();
            request.setMessageIds(new ArrayList<>(chunk.stream().map(SmsSendLog::getSolapiMessageId).toList()));
            request.setLimit(CHUNK);
            MessageListResponse response = service.getMessageList(request);
            return response.getMessageList() == null ? Map.of() : response.getMessageList();
        } catch (Exception e) {
            log.warn("솔라피 메시지 조회 실패: {}", e.getMessage());
            return Map.of();
        }
    }

    /**
     * 솔라피 상태코드 중 **아직 진행 중**이라 결과로 확정하면 안 되는 값.
     *   2000 대기(접수됨) · 3000 발송 중
     * 이 값을 실패로 굳히면 성공한 발송이 영구히 실패로 남고, PENDING 이 아니라서
     * 다음 동기화 대상에서도 빠져 되돌릴 수가 없다(실제로 그렇게 되어 있었다).
     */
    private static final Set<String> IN_PROGRESS_CODES = Set.of("2000", "3000");
    /** 정상 처리 완료. 도달 시각이 아직 안 실렸어도 실패는 아니다. */
    private static final String SUCCESS_CODE = "4000";

    /** 반영했으면 true. 아직 결과가 안 나온 건은 건드리지 않는다(다음 동기화에서 다시 본다). */
    private boolean applyTo(SmsSendLog entry, Message message) {
        LocalDateTime deliveredAt = parseDateTime(message.getDateReceived());
        boolean replacement = Boolean.TRUE.equals(message.getReplacement());
        String type = message.getType() == null ? null : message.getType().name();
        String statusCode = message.getStatusCode();

        // 도달 시각이 찍혔으면 그걸로 확정한다 — 가장 확실한 근거다.
        if (deliveredAt != null) {
            entry.applyDeliveryResult(type, statusCode, SmsSendLog.STATUS_SUCCESS, deliveredAt, replacement, null);
            propagateToQueue(entry, true, null);
            return true;
        }
        // 코드가 없거나 진행 중이면 아직 판단하지 않는다.
        if (statusCode == null || statusCode.isBlank() || IN_PROGRESS_CODES.contains(statusCode)) {
            return false;
        }
        // 4000 은 솔라피 기준 **수신 완료**다. 도달 시각이 안 실려 오는 경우가 있는데(대체발송·일부 통신사),
        // 그때마다 대기로 남기면 그 행은 영영 PENDING 으로 굳어 '점검 필요'에 계속 뜬다.
        // 코드가 성공이면 성공으로 확정하고, 도달 시각만 비워 둔다(화면은 발송일로 표시한다).
        if (SUCCESS_CODE.equals(statusCode)) {
            entry.applyDeliveryResult(type, statusCode, SmsSendLog.STATUS_SUCCESS, null, replacement, null);
            propagateToQueue(entry, true, null);
            return true;
        }
        String reason = "도달 실패 (상태코드 " + statusCode + ")";
        entry.applyDeliveryResult(type, statusCode, SmsSendLog.STATUS_FAILED, null, replacement, reason);
        propagateToQueue(entry, false, reason);
        return true;
    }

    /**
     * send_log 확정 결과를 대응하는 큐 행에 전파한다 — 웹훅 경로와 동일 규칙.
     * 두 경로가 갈리면 같은 발송을 두고 큐 상태가 어긋난다.
     */
    private void propagateToQueue(SmsSendLog entry, boolean success, String failReason) {
        queueService.findLatestReceivedId(entry.getTargetId(), entry.getTemplateCode())
                .ifPresent(queueId -> {
                    if (success) queueService.markDelivered(queueId);
                    else queueService.markDeliveryFailed(queueId, failReason);
                });
    }

    /** 솔라피 시각은 ISO-8601(오프셋 포함)로 온다. 형식이 달라도 죽지 않게 단계별로 시도한다. */
    private static LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return OffsetDateTime.parse(raw).atZoneSameInstant(SEOUL).toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(raw);
            } catch (Exception e) {
                log.warn("도달시각 파싱 실패: {}", raw);
                return null;
            }
        }
    }
}
