package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.config.SurgeryGroup;
import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsDispatchQueueRepository;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 문자 발송 큐(sms_dispatch_queue) 의 큐잉·폴링·재계산·재시도.
 *
 * <h3>역할 분리</h3>
 * <ul>
 *   <li>SmsImportJob 이 대상을 upsert 한 뒤 {@link #enqueueForTargets} 로 T1/T2/T3 3행 심는다.</li>
 *   <li>{@link SmsOffsetConfigService} 편집 API 가 {@link #recalculateScheduledForPending} 로
 *       미발송 큐의 예정 시각·kind 를 새 값으로 되민다(동기, 같은 트랜잭션).</li>
 *   <li>SmsTargetService 상태 변경이 {@link #cancelPendingForTarget} /
 *       {@link #reinstateForTarget} 를 부른다 — 홀딩 시 큐 취소, 해제 시 재등록.</li>
 *   <li>SmsDispatchJob 이 {@link #pollPending} 으로 뽑은 뒤 SmsSendService 로 넘긴다.</li>
 * </ul>
 *
 * <h3>SKIP LOCKED</h3>
 * 폴링은 EntityManager 네이티브 쿼리로 {@code FOR UPDATE SKIP LOCKED} 를 쓴다.
 * Postgres·H2 모두 지원(H2 는 no-op 에 가깝지만 문법 통과). 동시 워커 도입 대비.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsDispatchQueueService {

    private final SmsDispatchQueueRepository queueRepository;
    private final SmsTargetRepository targetRepository;
    private final SmsOffsetConfigService offsetConfigService;

    @PersistenceContext
    private EntityManager entityManager;

    /* ── 큐잉 ───────────────────────────────────────────── */

    /**
     * 대상 목록에 대해 T1/T2/T3 3행을 각각 심는다. 이미 있는 (target, tier, scheduled_at) 은 조용히 skip.
     *
     * <p>SENDABLE 대상만 대상. HOLD 는 홀딩 해제 시 {@link #reinstateForTarget} 가 처리한다.
     * 등록된 큐 개수를 돌려준다.
     */
    @Transactional
    public int enqueueForTargets(Collection<SmsTarget> targets) {
        if (targets == null || targets.isEmpty()) return 0;
        LocalDateTime now = LocalDateTime.now();
        int enqueued = 0;
        for (SmsTarget target : targets) {
            if (!target.isSendable()) continue;
            enqueued += enqueueForTarget(target, now);
        }
        return enqueued;
    }

    /** 단일 대상 재등록 — 홀딩 해제 훅에서 부른다. */
    @Transactional
    public int reinstateForTarget(SmsTarget target) {
        if (target == null || !target.isSendable()) return 0;
        return enqueueForTarget(target, LocalDateTime.now());
    }

    private int enqueueForTarget(SmsTarget target, LocalDateTime now) {
        // 이미 이 대상에 있는 (template, scheduled_at) 조합을 미리 뽑아서 중복 INSERT 를 피한다.
        Map<String, SmsDispatchQueue> existing = new HashMap<>();
        for (SmsDispatchQueue row : queueRepository.findByTargetIdInOrderByScheduledAtAsc(List.of(target.getId()))) {
            existing.put(row.getTemplateCode() + "@" + row.getScheduledAt(), row);
        }
        int inserted = 0;
        for (int tier = 1; tier <= 3; tier++) {
            LocalDateTime scheduled = scheduledAtOf(target, tier);
            String key = "T" + tier + "@" + scheduled;
            String kind = offsetConfigService.kindOf(tier);
            SmsDispatchQueue existingRow = existing.get(key);
            if (existingRow != null) {
                if (SmsDispatchQueue.STATUS_CANCELED.equals(existingRow.getStatus())) {
                    existingRow.reset(now);
                    existingRow.reschedule(scheduled, kind, now);
                    queueRepository.saveAndFlush(existingRow);
                    inserted++;
                }
                continue;
            }
            SmsDispatchQueue row = SmsDispatchQueue.builder()
                    .targetId(target.getId())
                    .templateCode("T" + tier)
                    .scheduledAt(scheduled)
                    .kind(kind)
                    .status(SmsDispatchQueue.STATUS_PENDING)
                    .attemptCount(0)
                    .build();
            row.stampCreated(now);
            try {
                queueRepository.saveAndFlush(row);
                inserted++;
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                // 병렬 잡·재실행으로 같은 (target,tier,scheduled_at) 이 이미 있을 때. 조용히 skip.
                log.debug("큐 중복 skip: target={}, tier={}, scheduled={}", target.getId(), tier, scheduled);
            }
        }
        return inserted;
    }

    /* ── 홀딩·취소 ──────────────────────────────────────── */

    /** 홀딩된 대상의 PENDING 큐를 취소한다. 이미 PROCESSING/DONE/FAILED 는 건드리지 않는다. */
    @Transactional
    public int cancelPendingForTarget(Long targetId, String reason) {
        List<SmsDispatchQueue> rows = queueRepository.findByTargetIdAndStatusIn(
                targetId, List.of(SmsDispatchQueue.STATUS_PENDING));
        LocalDateTime now = LocalDateTime.now();
        for (SmsDispatchQueue row : rows) {
            row.markCanceled(reason == null ? "홀딩" : reason, now);
        }
        return rows.size();
    }

    /* ── 오프셋·시각 편집 후 재계산 ─────────────────────────────── */

    /**
     * 모든 PENDING 큐의 scheduled_at·kind 를 오프셋 편집 이후 값으로 되민다.
     *
     * <p>이미 PROCESSING/DONE/FAILED/CANCELED 인 행은 건드리지 않는다 — 사이클 개념이 유지된다.
     * 트랜잭션은 호출자 (오프셋 편집 API) 와 하나로 묶는다 — 실패 시 편집도 롤백.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public int recalculateScheduledForPending() {
        List<SmsDispatchQueue> pending = queueRepository.findByStatus(SmsDispatchQueue.STATUS_PENDING);
        if (pending.isEmpty()) return 0;
        Set<Long> targetIds = pending.stream().map(SmsDispatchQueue::getTargetId).collect(Collectors.toSet());
        Map<Long, SmsTarget> targetById = targetRepository.findAllById(targetIds).stream()
                .collect(Collectors.toMap(SmsTarget::getId, t -> t));
        LocalDateTime now = LocalDateTime.now();
        int changed = 0;
        for (SmsDispatchQueue row : pending) {
            SmsTarget target = targetById.get(row.getTargetId());
            if (target == null) continue;
            int tier = tierOf(row.getTemplateCode());
            LocalDateTime newScheduled = scheduledAtOf(target, tier);
            String newKind = offsetConfigService.kindOf(tier);
            if (!newScheduled.equals(row.getScheduledAt()) || !newKind.equals(row.getKind())) {
                row.reschedule(newScheduled, newKind, now);
                changed++;
            }
        }
        log.info("SMS 큐 재계산: pending={}, changed={}", pending.size(), changed);
        return changed;
    }

    /* ── 폴링 (SmsDispatchJob 이 부른다) ─────────────────────── */

    /**
     * scheduled_at 도래한 PENDING 큐를 배치 크기만큼 잡는다. FOR UPDATE SKIP LOCKED 로
     * 동시 워커가 같은 행을 잡지 않는다. 잡은 즉시 상태 PROCESSING 으로 전이해 커밋한다.
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public List<SmsDispatchQueue> pollPending(int batchSize, LocalDateTime cutoff) {
        // JPA 로는 SKIP LOCKED 를 표현할 수 없어 네이티브 쿼리 — H2·Postgres 모두 지원.
        String sql = "SELECT * FROM sms_dispatch_queue WHERE status = 'PENDING' AND scheduled_at <= :cutoff "
                + "ORDER BY scheduled_at ASC LIMIT :batchSize FOR UPDATE SKIP LOCKED";
        List<SmsDispatchQueue> rows = entityManager.createNativeQuery(sql, SmsDispatchQueue.class)
                .setParameter("cutoff", cutoff)
                .setParameter("batchSize", batchSize)
                .getResultList();
        LocalDateTime now = LocalDateTime.now();
        for (SmsDispatchQueue row : rows) {
            row.markProcessing(now);
        }
        // 트랜잭션 커밋 시 PROCESSING 상태 확정. 이후 실제 발송은 트랜잭션 밖에서.
        return rows;
    }

    /* ── 결과 반영 (SmsDispatchJob 이 발송 결과로 부른다) ─────── */

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markDone(Long queueId) {
        queueRepository.findById(queueId).ifPresent(row -> row.markDone(LocalDateTime.now()));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCanceled(Long queueId, String reason) {
        queueRepository.findById(queueId).ifPresent(row -> row.markCanceled(reason, LocalDateTime.now()));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long queueId, String errorMessage, int maxAttempts) {
        queueRepository.findById(queueId).ifPresent(
                row -> row.markFailedAttempt(errorMessage, maxAttempts, LocalDateTime.now()));
    }

    /* ── 관리자 API ───────────────────────────────────────── */

    /** FAILED/CANCELED 를 PENDING 으로 되돌린다. attempt_count 도 리셋 — "이 상태에서 다시 시도" 의미. */
    @Transactional
    public int retryRows(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        List<SmsDispatchQueue> rows = queueRepository.findByIdIn(ids);
        LocalDateTime now = LocalDateTime.now();
        int reset = 0;
        for (SmsDispatchQueue row : rows) {
            if (!SmsDispatchQueue.STATUS_FAILED.equals(row.getStatus())
                    && !SmsDispatchQueue.STATUS_CANCELED.equals(row.getStatus())) {
                continue;
            }
            row.reset(now);
            reset++;
        }
        return reset;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> statusCounts() {
        Map<String, Long> counts = new HashMap<>();
        counts.put(SmsDispatchQueue.STATUS_PENDING, 0L);
        counts.put(SmsDispatchQueue.STATUS_PROCESSING, 0L);
        counts.put(SmsDispatchQueue.STATUS_DONE, 0L);
        counts.put(SmsDispatchQueue.STATUS_FAILED, 0L);
        counts.put(SmsDispatchQueue.STATUS_CANCELED, 0L);
        for (Object[] row : queueRepository.countLatestByStatus()) {
            if (row.length < 2 || row[0] == null || row[1] == null) continue;
            counts.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return counts;
    }

    @Transactional(readOnly = true)
    public long countDoneToday() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        return queueRepository.countByStatusAndProcessedAtGreaterThanEqualAndProcessedAtLessThan(
                SmsDispatchQueue.STATUS_DONE, start, end);
    }

    @Transactional(readOnly = true)
    public List<SmsDispatchQueue> findByStatus(String status, int limit) {
        List<SmsDispatchQueue> all = queueRepository.findByStatus(status);
        return all.size() > limit ? new ArrayList<>(all.subList(0, limit)) : all;
    }

    /* ── 산식 helper ─────────────────────────────────────── */

    /** 대상+차수 → 발송 예정 LocalDateTime (기준일 + offset days at timeOf(tier)). */
    LocalDateTime scheduledAtOf(SmsTarget target, int tier) {
        String groupCode = SurgeryGroup.of(target.getOpType()).code();
        int offset = offsetConfigService.offsetOf(groupCode, tier);
        LocalDate date = target.scheduleBase().plusDays(offset);
        LocalTime time = offsetConfigService.timeOf(tier);
        return LocalDateTime.of(date, time);
    }

    private static int tierOf(String templateCode) {
        if (templateCode == null || templateCode.length() < 2) return 1;
        try {
            return Integer.parseInt(templateCode.substring(1));
        } catch (NumberFormatException e) {
            return 1;
        }
    }

}
