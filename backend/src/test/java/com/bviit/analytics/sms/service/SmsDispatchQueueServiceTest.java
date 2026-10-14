package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsDispatchQueueRepository;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link SmsDispatchQueueService#enqueueForTargets} 멱등성 검증.
 *
 * <p>2026-10-01 사고(docs/sms/incidents/2026-10-01-reconcile-bulk-dispatch.md) 재발 방지의 핵심 테스트 집단.
 * 멱등 체크 축이 {@code (target_id, template_code)} 단일 키라서 clamping·오프셋 변경·op_type 변경 등
 * {@code scheduled_at} 이 어긋나는 어떤 경로에서도 중복 insert 가 생기지 않아야 한다는 불변식을 지킨다.
 */
class SmsDispatchQueueServiceTest {

    private SmsDispatchQueueRepository queueRepository;
    private SmsOffsetConfigService offsetConfigService;
    private SmsDispatchQueueService service;
    private SmsTarget target;

    @BeforeEach
    void setUp() {
        queueRepository = mock(SmsDispatchQueueRepository.class);
        offsetConfigService = mock(SmsOffsetConfigService.class);
        service = new SmsDispatchQueueService(
                queueRepository, mock(SmsTargetRepository.class), offsetConfigService);

        target = SmsTarget.builder()
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
    }

    @Test
    void 홀딩_해제는_현재_취소큐를_새로_쌓지_않고_복구한다() {
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

    @Test
    void 신규_target_은_T1_T2_T3_세_개를_insert_한다() {
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L))).thenReturn(List.of());

        int enqueued = service.enqueueForTargets(List.of(target));

        assertThat(enqueued).isEqualTo(3);
        verify(queueRepository, times(3)).saveAndFlush(any(SmsDispatchQueue.class));
    }

    @Test
    void 이미_PENDING_큐가_있으면_같은_차수를_재_insert_하지_않는다() {
        SmsDispatchQueue pending = buildQueue("T1", LocalDateTime.of(2026, 8, 31, 10, 0),
                SmsDispatchQueue.STATUS_PENDING);
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L))).thenReturn(List.of(pending));

        int enqueued = service.enqueueForTargets(List.of(target));

        // T1 은 skip, T2·T3 만 신규 insert
        assertThat(enqueued).isEqualTo(2);
        verify(queueRepository, times(2)).saveAndFlush(any(SmsDispatchQueue.class));
    }

    /**
     * 2026-10-01 사고 재현 방지의 핵심 테스트 — Phase 2 멱등 fix 를 잃으면 이 테스트가 먼저 깨진다.
     *
     * <p>저장된 DONE row 의 {@code scheduled_at}(8/31 03:00, clamp 된 과거 값) 과 재계산 결과
     * ({@code surgery_date}+1@10:00 = 8/31 10:00) 가 어긋나지만, 멱등 체크는 {@code (target, tier)}
     * 만 보므로 skip 되어야 한다. 과거 로직은 slot 미스매치로 새 row 를 꽂아 중복 발송을 유발했다.
     */
    @Test
    void scheduled_at_이_어긋나도_DONE_가_있으면_중복_insert_안_한다() {
        SmsDispatchQueue clampedDone = buildQueue("T1", LocalDateTime.of(2026, 8, 31, 3, 0),
                SmsDispatchQueue.STATUS_DONE);
        clampedDone.markDelivered(LocalDateTime.of(2026, 8, 31, 3, 5));
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L))).thenReturn(List.of(clampedDone));

        int enqueued = service.enqueueForTargets(List.of(target));

        // T1 skip (DONE 보존), T2·T3 신규 insert
        assertThat(enqueued).isEqualTo(2);
        verify(queueRepository, times(2)).saveAndFlush(any(SmsDispatchQueue.class));
        // 특히 clampedDone 자체는 아무도 안 건드려야 한다 — DONE 보존.
        assertThat(clampedDone.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_DONE);
    }

    @Test
    void 이미_FAILED_큐가_있으면_자동_재큐잉_하지_않는다() {
        // FAILED 는 관리자 "실패 재실행" API 로만 되살아난다 — 자동 enqueue 가 되살리면 안 됨.
        SmsDispatchQueue failed = buildQueue("T1", LocalDateTime.of(2026, 8, 31, 10, 0),
                SmsDispatchQueue.STATUS_FAILED);
        failed.markDeliveryFailed("Solapi reject", LocalDateTime.of(2026, 8, 31, 10, 15));
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L))).thenReturn(List.of(failed));

        int enqueued = service.enqueueForTargets(List.of(target));

        assertThat(enqueued).isEqualTo(2);
        assertThat(failed.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_FAILED);
    }

    @Test
    void CANCELED_만_있으면_가장_최근_한_건을_재사용한다() {
        // 홀딩 해제 흐름의 핵심 — 과거 CANCELED 를 그대로 두고 새 row 를 추가로 꽂지 않는다.
        SmsDispatchQueue oldCanceled = buildQueue("T1", LocalDateTime.of(2026, 8, 31, 10, 0),
                SmsDispatchQueue.STATUS_CANCELED);
        SmsDispatchQueue newCanceled = buildQueue("T1", LocalDateTime.of(2026, 9, 10, 10, 0),
                SmsDispatchQueue.STATUS_CANCELED);
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L)))
                .thenReturn(List.of(oldCanceled, newCanceled));

        int enqueued = service.enqueueForTargets(List.of(target));

        // T1 재사용(가장 최근 newCanceled 한 건), T2·T3 신규 insert
        assertThat(enqueued).isEqualTo(3);
        // 재사용 대상 = ASC 끝에 있는 newCanceled, PENDING 으로 복구
        assertThat(newCanceled.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_PENDING);
        // 가장 오래된 oldCanceled 는 그대로 CANCELED 로 남음
        assertThat(oldCanceled.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_CANCELED);
        verify(queueRepository, never()).delete(any());
    }

    /**
     * 홀딩 반복 흐름 — 과거 CANCELED 가 축적된 상태에서 발송중지 해제 후 또 발송중지가 걸려
     * 현재 사이클 PENDING 이 CANCELED 로 바뀌지 않고 그대로 있는 상황(해제 → 발송 전 다시 홀딩).
     * 큐 상태: 과거 CANCELED + 현재 PENDING. PENDING 때문에 lockedExists=true → T1 전체 skip.
     */
    @Test
    void PENDING_과_과거_CANCELED_가_공존하면_PENDING_때문에_skip_한다() {
        SmsDispatchQueue oldCanceled = buildQueue("T1", LocalDateTime.of(2026, 8, 20, 10, 0),
                SmsDispatchQueue.STATUS_CANCELED);
        SmsDispatchQueue currentPending = buildQueue("T1", LocalDateTime.of(2026, 8, 31, 10, 0),
                SmsDispatchQueue.STATUS_PENDING);
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L)))
                .thenReturn(List.of(oldCanceled, currentPending));

        int enqueued = service.enqueueForTargets(List.of(target));

        // T1 skip (PENDING 보존), T2·T3 신규 insert
        assertThat(enqueued).isEqualTo(2);
        verify(queueRepository, times(2)).saveAndFlush(any(SmsDispatchQueue.class));
        // 두 T1 row 전부 안 건드려야 함
        assertThat(currentPending.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_PENDING);
        assertThat(oldCanceled.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_CANCELED);
    }

    /**
     * PROCESSING = 폴러가 FOR UPDATE SKIP LOCKED 로 집어 발송 시도 중인 상태.
     * 동시에 enqueue 가 돌아도 재 insert 하면 안 된다 — 동시성 안전 검증.
     */
    @Test
    void PROCESSING_상태도_skip_한다() {
        SmsDispatchQueue processing = buildQueue("T1", LocalDateTime.of(2026, 8, 31, 10, 0),
                SmsDispatchQueue.STATUS_PROCESSING);
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L)))
                .thenReturn(List.of(processing));

        int enqueued = service.enqueueForTargets(List.of(target));

        assertThat(enqueued).isEqualTo(2);
        assertThat(processing.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_PROCESSING);
    }

    /**
     * ETC 그룹(백내장·재수술·미등록 opType) 은 큐를 하나도 심지 않는다.
     * {@link com.bviit.analytics.sms.config.SurgeryGroup#ETC} 는 문구 슬롯이 비어 있어
     * 어차피 발송 안 될 뿐 아니라, PENDING 으로 남겨두면 폴링마다 재시도되어 로그 소음만 낸다.
     */
    @Test
    void ETC_그룹_target_은_큐를_하나도_만들지_않는다() {
        SmsTarget etcTarget = SmsTarget.builder()
                .chartNo("9999999")
                .name("백내장")
                .phone("01000000000")
                .surgeryDate(LocalDate.of(2026, 8, 30))
                .opType("cataract")   // SurgeryGroup.ETC 로 매핑 (BY_OP_TYPE 미등록)
                .status(SmsTarget.STATUS_SENDABLE)
                .source(SmsTarget.SOURCE_AUTO)
                .build();
        etcTarget.stampCreated(LocalDateTime.of(2026, 8, 30, 9, 0));
        ReflectionTestUtils.setField(etcTarget, "id", 99L);

        int enqueued = service.enqueueForTargets(List.of(etcTarget));

        assertThat(enqueued).isEqualTo(0);
        verify(queueRepository, never()).saveAndFlush(any(SmsDispatchQueue.class));
        // 큐 조회조차 안 함 (ETC 는 early return)
        verify(queueRepository, never()).findByTargetIdInOrderByScheduledAtAsc(any());
    }

    /**
     * CANCELED 재사용 시 scheduled_at·kind 가 재계산값으로 반영되는지 — 홀딩 중 오프셋 설정이
     * 바뀌었거나 수술일이 바뀐 경우에도 재사용 row 가 새 값으로 되민다는 보장. status 만 바뀌는 게
     * 아니라 다음 폴링이 정확한 scheduled_at 에 걸리도록 하는 핵심.
     *
     * <p>⚠️ 재계산값이 과거이면 {@link SmsDispatchQueue#reschedule(LocalDateTime, String, LocalDateTime)}
     * 가 {@code now} 로 clamp 하므로, 이 테스트는 <b>미래 수술일</b>로 설정해 clamp 없이 정확한 값을
     * 검증한다. 과거 scheduled 의 clamp 거동은 다른 테스트(사고 재현 방지)에서 간접 검증한다.
     */
    @Test
    void CANCELED_재사용_시_scheduled_at_과_kind_가_재계산값으로_갱신된다() {
        // 미래 수술일로 설정해 clamp 없이 재계산값 그대로 저장되는지 검증
        LocalDate futureSurgeryDate = LocalDate.of(2030, 5, 30);
        SmsTarget futureTarget = SmsTarget.builder()
                .chartNo("2234451")
                .name("홍길동")
                .phone("01080690814")
                .surgeryDate(futureSurgeryDate)
                .opType("smile")
                .status(SmsTarget.STATUS_SENDABLE)
                .source(SmsTarget.SOURCE_AUTO)
                .build();
        futureTarget.stampCreated(LocalDateTime.of(2026, 1, 1, 9, 0));
        ReflectionTestUtils.setField(futureTarget, "id", 10L);

        LocalDateTime oldScheduledAt = LocalDateTime.of(2026, 8, 20, 10, 0);
        SmsDispatchQueue canceled = buildQueue("T1", oldScheduledAt, SmsDispatchQueue.STATUS_CANCELED);
        when(queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(10L)))
                .thenReturn(List.of(canceled));

        service.enqueueForTargets(List.of(futureTarget));

        // 2030-05-30 + T1 offset(+1) at 10:00 → 2030-05-31 10:00 로 재계산 (미래이므로 clamp 없음)
        LocalDateTime expected = LocalDateTime.of(2030, 5, 31, 10, 0);
        assertThat(canceled.getStatus()).isEqualTo(SmsDispatchQueue.STATUS_PENDING);
        assertThat(canceled.getScheduledAt()).isEqualTo(expected);
        assertThat(canceled.getScheduledAt()).isNotEqualTo(oldScheduledAt);
        assertThat(canceled.getKind()).isEqualTo(SmsDispatchQueue.KIND_NOTIFICATION);
    }

    private SmsDispatchQueue buildQueue(String templateCode, LocalDateTime scheduledAt, String status) {
        return SmsDispatchQueue.builder()
                .targetId(10L)
                .templateCode(templateCode)
                .scheduledAt(scheduledAt)
                .kind(SmsDispatchQueue.KIND_NOTIFICATION)
                .status(status)
                .attemptCount(0)
                .createdAt(scheduledAt.minusDays(1))
                .build();
    }
}
