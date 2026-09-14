package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsDispatchQueueRepository;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmsDispatchQueueServiceTest {

    @Test
    void 홀딩_해제는_현재_취소큐를_새로_쌓지_않고_복구한다() {
        SmsDispatchQueueRepository queueRepository = mock(SmsDispatchQueueRepository.class);
        SmsOffsetConfigService offsetConfigService = mock(SmsOffsetConfigService.class);
        SmsDispatchQueueService service = new SmsDispatchQueueService(
                queueRepository, mock(SmsTargetRepository.class), offsetConfigService);

        SmsTarget target = SmsTarget.builder()
                .chartNo("2234451")
                .name("홍길동")
                .phone("01080690814")
                .surgeryDate(LocalDate.of(2026, 8, 30))
                .opType("smile")
                .status(SmsTarget.STATUS_SENDABLE)
                .source(SmsTarget.SOURCE_AUTO)
                .build();
        target.stampCreated(LocalDateTime.of(2026, 8, 30, 9, 0));
        ReflectionTestUtils.setField(target, "id", 10L);

        when(offsetConfigService.offsetOf("SMILE", 1)).thenReturn(1);
        when(offsetConfigService.offsetOf("SMILE", 2)).thenReturn(7);
        when(offsetConfigService.offsetOf("SMILE", 3)).thenReturn(14);
        when(offsetConfigService.timeOf(1)).thenReturn(LocalTime.of(10, 0));
        when(offsetConfigService.timeOf(2)).thenReturn(LocalTime.of(10, 0));
        when(offsetConfigService.timeOf(3)).thenReturn(LocalTime.of(10, 0));
        when(offsetConfigService.kindOf(any(Integer.class))).thenReturn(SmsDispatchQueue.KIND_NOTIFICATION);

        SmsDispatchQueue canceled = SmsDispatchQueue.builder()
                .targetId(10L)
                .templateCode("T1")
                .scheduledAt(LocalDateTime.of(2026, 8, 31, 10, 0))
                .kind(SmsDispatchQueue.KIND_NOTIFICATION)
                .status(SmsDispatchQueue.STATUS_CANCELED)
                .attemptCount(0)
                .lastError("홀딩")
                .processedAt(LocalDateTime.of(2026, 8, 31, 9, 0))
                .createdAt(LocalDateTime.of(2026, 8, 30, 9, 0))
                .build();
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L))).thenReturn(List.of(canceled));

        int changed = service.reinstateForTarget(target);

        assertThat(changed).isEqualTo(3);
        assertThat(canceled.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_PENDING);
        assertThat(canceled.getLastError()).isNull();
        assertThat(canceled.getProcessedAt()).isNull();
        verify(queueRepository).saveAndFlush(eq(canceled));
    }
}
