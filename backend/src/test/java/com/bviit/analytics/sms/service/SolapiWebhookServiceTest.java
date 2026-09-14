package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.dto.SolapiMessageReportEvent;
import com.bviit.analytics.sms.entity.SmsSendLog;
import com.bviit.analytics.sms.repository.SmsSendLogRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

/**
 * 웹훅 처리 판정 로직 — {@link SolapiSyncService} 와 규칙이 어긋나면 같은 발송을 두고 상태가 갈린다.
 * 두 경로가 같은 결론에 도달하는지 여기서 잠근다.
 */
class SolapiWebhookServiceTest {

    @Test
    void 도달시각이_있으면_그_시각으로_SUCCESS_로_확정한다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsSendLog log = pendingLog("MSG-DELIVERED", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-DELIVERED")).thenReturn(Optional.of(log));

        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));
        int updated = service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-DELIVERED", "GRP", "ATA", "01011112222", "01033334444",
                "4000", "OK", null, null, "2026-09-01T10:00:00+09:00", null)));

        assertThat(updated).isEqualTo(1);
        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_SUCCESS);
        assertThat(log.getDeliveredAt()).isEqualTo(LocalDateTime.of(2026, 9, 1, 10, 0));
        assertThat(log.getStatusCode()).isEqualTo("4000");
        assertThat(log.isReplacement()).isFalse();
    }

    @Test
    void statusCode_4000_이면_도달시각이_없어도_SUCCESS_로_확정한다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsSendLog log = pendingLog("MSG-4000-NO-TIME", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-4000-NO-TIME")).thenReturn(Optional.of(log));

        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));
        int updated = service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-4000-NO-TIME", null, "ATA", null, null,
                "4000", null, null, null, null, null)));

        assertThat(updated).isEqualTo(1);
        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_SUCCESS);
        assertThat(log.getDeliveredAt()).isNull();
    }

    @Test
    void statusCode_2000_3000_이면_판단_보류하고_상태를_바꾸지_않는다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsSendLog log = pendingLog("MSG-IN-PROGRESS", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-IN-PROGRESS")).thenReturn(Optional.of(log));

        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));
        int updated = service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-IN-PROGRESS", null, "ATA", null, null,
                "2000", "waiting", null, null, null, null)));

        assertThat(updated).isZero();
        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_PENDING);
    }

    @Test
    void 실패_상태코드는_FAILED_로_굳히고_사유에_상태메시지를_남긴다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsSendLog log = pendingLog("MSG-FAIL", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-FAIL")).thenReturn(Optional.of(log));

        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));
        service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-FAIL", null, "ATA", null, null,
                "4020", "카톡 미승인", null, null, null, null)));

        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_FAILED);
        assertThat(log.getStatusCode()).isEqualTo("4020");
        assertThat(log.getFailReason()).contains("4020").contains("카톡 미승인");
    }

    @Test
    void 알림톡_요청인데_응답_type_이_ATA_가_아니면_대체발송으로_기록한다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsSendLog log = pendingLog("MSG-REPLACED", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-REPLACED")).thenReturn(Optional.of(log));

        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));
        service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-REPLACED", null, "LMS", null, null,
                "4000", null, null, null, "2026-09-01T10:00:00+09:00", null)));

        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_SUCCESS);
        assertThat(log.isReplacement()).isTrue();
        assertThat(log.getMessageType()).isEqualTo("LMS");
    }

    @Test
    void 매칭되는_이력이_없으면_조용히_건너뛴다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        when(repository.findBySolapiMessageId("MSG-UNKNOWN")).thenReturn(Optional.empty());

        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));
        int updated = service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-UNKNOWN", null, "ATA", null, null,
                "4000", null, null, null, "2026-09-01T10:00:00+09:00", null)));

        assertThat(updated).isZero();
        verify(repository).findBySolapiMessageId("MSG-UNKNOWN");
        verifyNoMoreInteractions(repository);
    }

    @Test
    void 이벤트가_비어_있으면_리포지토리를_건드리지_않는다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SolapiWebhookService service = new SolapiWebhookService(repository, mock(SmsDispatchQueueService.class));

        assertThat(service.applyMessageReports(List.of())).isZero();
        assertThat(service.applyMessageReports(null)).isZero();
        verifyNoMoreInteractions(repository);
    }

    @Test
    void SUCCESS_확정_시_대응_큐를_찾아_markDelivered_한다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsDispatchQueueService queueService = mock(SmsDispatchQueueService.class);
        SmsSendLog log = pendingLog("MSG-Q-OK", "ALIMTALK");
        // targetId·templateCode 는 pendingLog helper 가 채워 두는 값(1L, "T1")
        when(repository.findBySolapiMessageId("MSG-Q-OK")).thenReturn(Optional.of(log));
        when(queueService.findLatestReceivedId(1L, "T1")).thenReturn(Optional.of(42L));

        SolapiWebhookService service = new SolapiWebhookService(repository, queueService);
        service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-Q-OK", null, "ATA", null, null,
                "4000", null, null, null, "2026-09-01T10:00:00+09:00", null)));

        verify(queueService).markDelivered(42L);
    }

    @Test
    void FAILED_확정_시_대응_큐를_찾아_markDeliveryFailed_한다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsDispatchQueueService queueService = mock(SmsDispatchQueueService.class);
        SmsSendLog log = pendingLog("MSG-Q-FAIL", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-Q-FAIL")).thenReturn(Optional.of(log));
        when(queueService.findLatestReceivedId(1L, "T1")).thenReturn(Optional.of(43L));

        SolapiWebhookService service = new SolapiWebhookService(repository, queueService);
        service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-Q-FAIL", null, "ATA", null, null,
                "4020", "카톡 미승인", null, null, null, null)));

        verify(queueService).markDeliveryFailed(eq(43L), anyString());
    }

    @Test
    void 판단_보류_이벤트는_큐를_건드리지_않는다() {
        SmsSendLogRepository repository = mock(SmsSendLogRepository.class);
        SmsDispatchQueueService queueService = mock(SmsDispatchQueueService.class);
        SmsSendLog log = pendingLog("MSG-Q-DEFER", "ALIMTALK");
        when(repository.findBySolapiMessageId("MSG-Q-DEFER")).thenReturn(Optional.of(log));

        SolapiWebhookService service = new SolapiWebhookService(repository, queueService);
        service.applyMessageReports(List.of(new SolapiMessageReportEvent(
                "MSG-Q-DEFER", null, "ATA", null, null,
                "2000", "waiting", null, null, null, null)));

        verify(queueService, never()).markDelivered(org.mockito.ArgumentMatchers.anyLong());
        verify(queueService, never()).markDeliveryFailed(org.mockito.ArgumentMatchers.anyLong(), anyString());
    }

    private static SmsSendLog pendingLog(String messageId, String requestedChannel) {
        return SmsSendLog.builder()
                .targetId(1L)
                .templateCode("T1")
                .requestedChannel(requestedChannel)
                .solapiMessageId(messageId)
                .status(SmsSendLog.STATUS_PENDING)
                .sentAt(LocalDateTime.of(2026, 9, 1, 9, 0))
                .build();
    }
}
