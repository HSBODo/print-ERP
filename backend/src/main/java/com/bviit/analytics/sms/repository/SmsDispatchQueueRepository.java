package com.bviit.analytics.sms.repository;

import com.bviit.analytics.sms.entity.SmsDispatchQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    /** 발송 이력 동기화 후 같은 대상+차수의 최신 큐 상태를 맞출 때 쓴다. */
    List<SmsDispatchQueue> findByTargetIdAndTemplateCodeAndStatusInOrderByScheduledAtDesc(
            Long targetId, String templateCode, Collection<String> statuses);

    /** 상태별 카운트 — 관리자 화면 상단 KPI. */
    long countByStatus(String status);

    /**
     * 상단 KPI 는 큐 이력 누적이 아니라 현재 사이클 상태를 보여준다.
     * 같은 대상+차수의 과거 CANCELED 행은 제외하고 scheduled_at 이 가장 최신인 행만 센다.
     */
    @Query(value = "SELECT q.status, COUNT(*) FROM sms_dispatch_queue q "
            + "JOIN (SELECT target_id, template_code, MAX(scheduled_at) AS scheduled_at "
            + "FROM sms_dispatch_queue GROUP BY target_id, template_code) latest "
            + "ON latest.target_id = q.target_id "
            + "AND latest.template_code = q.template_code "
            + "AND latest.scheduled_at = q.scheduled_at "
            + "GROUP BY q.status", nativeQuery = true)
    List<Object[]> countLatestByStatus();

    /** 오늘 처리 완료(DONE) 카운트 — sms.dispatch.daily-limit 판정. */
    long countByStatusAndProcessedAtGreaterThanEqualAndProcessedAtLessThan(
            String status, LocalDateTime from, LocalDateTime to);

    /** 전 그룹의 PENDING 큐 — 오프셋 편집 후 재계산 대상. */
    List<SmsDispatchQueue> findByStatus(String status);

    /**
     * 상태 + scheduled_at 범위 조회 — 관리자 화면의 큐 이력 열람용.
     * scheduled_at 은 항상 채워져 있어 어느 상태에도 안전한 필터 축이 된다.
     */
    List<SmsDispatchQueue> findByStatusAndScheduledAtGreaterThanEqualAndScheduledAtLessThan(
            String status, LocalDateTime from, LocalDateTime to);

    /** 관리자 재실행 대상 — 여러 id 일괄 조회. */
    List<SmsDispatchQueue> findByIdIn(Collection<Long> ids);
}
