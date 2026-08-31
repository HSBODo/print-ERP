package com.bviit.analytics.sms.repository;

import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * ⚠️ 여기에는 SQL 텍스트 블록을 두지 않는다(RepositorySqlResourceCoverageTest 가 막는다).
 *    폴링용 FOR UPDATE SKIP LOCKED 는 서비스가 EntityManager 네이티브로 다룬다
 *    ({@code SmsDispatchQueueService#pollPending}).
 */
public interface SmsDispatchQueueRepository extends JpaRepository<SmsDispatchQueue, Long> {

    /** 대상별 큐 조회 — 오프셋 재계산·홀딩 취소·이력 조회에서 쓴다. */
    List<SmsDispatchQueue> findByTargetIdInOrderByScheduledAtAsc(Collection<Long> targetIds);

    /** 특정 상태의 대상별 큐 — 홀딩 시 PENDING 만 취소하는 등 세부 조건. */
    List<SmsDispatchQueue> findByTargetIdAndStatusIn(Long targetId, Collection<String> statuses);

    /** 상태별 카운트 — 관리자 화면 상단 KPI. */
    long countByStatus(String status);

    /** 오늘 처리 완료(DONE) 카운트 — sms.dispatch.daily-limit 판정. */
    long countByStatusAndProcessedAtGreaterThanEqualAndProcessedAtLessThan(
            String status, LocalDateTime from, LocalDateTime to);

    /** 전 그룹의 PENDING 큐 — 오프셋 편집 후 재계산 대상. */
    List<SmsDispatchQueue> findByStatus(String status);

    /** 관리자 재실행 대상 — 여러 id 일괄 조회. */
    List<SmsDispatchQueue> findByIdIn(Collection<Long> ids);
}
