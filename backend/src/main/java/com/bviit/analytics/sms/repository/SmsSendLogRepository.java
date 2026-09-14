package com.bviit.analytics.sms.repository;

import com.bviit.analytics.sms.entity.SmsSendLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * ⚠️ 여기에는 SQL 텍스트 블록을 두지 않는다(RepositorySqlResourceCoverageTest 가 막는다).
 *    조건은 파생 쿼리로 표현하고, 조합(중복 제거 등)은 서비스에서 한다.
 */
public interface SmsSendLogRepository extends JpaRepository<SmsSendLog, Long> {

    List<SmsSendLog> findByTargetIdInOrderBySentAtDesc(Collection<Long> targetIds);

    /**
     * 솔라피 메시지 ID 로 이력 1건 조회 — 웹훅(SINGLE-REPORT) 이 재조회 대신 쓰는 경로.
     * 접수 시 채워지는 solapiMessageId 는 계정 내 유일하므로 결과는 0 또는 1건.
     */
    Optional<SmsSendLog> findBySolapiMessageId(String solapiMessageId);

    /**
     * 이 사람에게 이 차수가 <b>이미 나갔는지</b> — 사이클(cycle_base)과 무관하게 본다.
     *
     * 멱등키는 (대상, 차수, 사이클)이라 기준일이 다시 깔리면 통과한다. 그건 <b>못 보낸 차수</b>를
     * 되살리려는 장치인데, 이미 도달한 차수까지 다시 나가면 같은 안내를 두 번 받는다.
     * 실패(FAILED)만 예외로 둬 재시도가 막히지 않게 한다.
     */
    boolean existsByTargetIdAndTemplateCodeAndStatusNot(Long targetId, String templateCode, String status);

    /** 접수 응답을 못 받고 남은 건 — 발송 도중 죽으면 메시지 ID 없는 PENDING 이 남는다. */
    List<SmsSendLog> findByStatusAndSentAtLessThan(String status, LocalDateTime sentBefore);

    /**
     * 결과 동기화 대상 — 접수는 됐는데(메시지 ID 있음) 아직 도달 확인이 안 된 이력.
     * 이미 완료·실패로 확정된 건은 다시 묻지 않는다.
     */
    List<SmsSendLog> findByStatusAndSolapiMessageIdIsNotNullAndSentAtGreaterThanEqualAndSentAtLessThanOrderBySentAtDesc(
            String status, LocalDateTime from, LocalDateTime to);

    /** 실제발송일 기준 조회 — 그 기간에 발송된 이력(전체 차수). */
    List<SmsSendLog> findBySentAtGreaterThanEqualAndSentAtLessThan(LocalDateTime from, LocalDateTime to);

    /** 실제발송일 기준 조회 — 차수를 지정한 경우. */
    List<SmsSendLog> findByTemplateCodeAndSentAtGreaterThanEqualAndSentAtLessThan(
            String templateCode, LocalDateTime from, LocalDateTime to);
}
