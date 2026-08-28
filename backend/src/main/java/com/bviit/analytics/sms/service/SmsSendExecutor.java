package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.bviit.analytics.sms.entity.SmsSendLog;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsOptOutRepository;
import com.bviit.analytics.sms.repository.SmsSendLogRepository;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 발송의 DB 단계만 담당한다 — **대상 하나당 독립 트랜잭션**.
 *
 * 왜 나눴나. 예전에는 전체 발송이 트랜잭션 하나였다. 문자는 이미 나갔는데 뒤에서 DB 가 실패하면
 * 이력이 통째로 롤백돼 "보냈는데 기록이 없는" 상태가 됐다 — 다음 실행이 같은 사람에게 또 보낸다.
 *
 * 그래서 순서를 바꿨다(Outbox):
 *   1) reserve  발송 **의도**를 PENDING 으로 먼저 저장하고 커밋한다.
 *   2) (트랜잭션 밖) 실제 발송
 *   3) complete 결과를 그 행에 기록한다.
 * 중간에 죽어도 PENDING 행이 남아 흔적이 사라지지 않는다.
 *
 * 중복은 DB 가 막는다 — (target_id, template_code, cycle_base) 부분 유니크 인덱스(V52).
 * 애플리케이션 검사만으로는 동시 요청을 못 막기 때문에 제약으로 둔다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsSendExecutor {

    private final SmsSendLogRepository logRepository;
    private final SmsTargetRepository targetRepository;
    private final SmsOptOutRepository optOutRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<SmsTarget> findTarget(Long targetId) {
        return targetRepository.findById(targetId);
    }

    /**
     * 수신거부한 번호인지 — <b>발송 직전에</b> 한 번 더 본다.
     * 적재 시점에도 막지만, 그 뒤에 등록됐을 수 있다. 마지막 관문은 여기다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public boolean isOptedOut(String phone) {
        return optOutRepository.existsByPhone(SmsTarget.normalizePhone(phone));
    }

    /**
     * 이 사람에게 이 차수가 이미 나갔는지 — <b>사이클과 무관하게</b> 본다.
     * 멱등키(대상·차수·사이클)는 기준일이 다시 깔리면 통과하므로, 그것만으로는
     * 이미 도달한 차수의 재발송을 막지 못한다. 실패분은 재시도해야 하므로 제외한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public boolean alreadySent(Long targetId, String templateCode) {
        return logRepository.existsByTargetIdAndTemplateCodeAndStatusNot(
                targetId, templateCode, SmsSendLog.STATUS_FAILED);
    }

    /**
     * 발송 의도를 남긴다. 같은 사이클의 같은 차수가 이미 있으면(멱등키 충돌) 빈 값 —
     * 이 경우 발송하지 않고 건너뛴다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Long> reserve(SmsTarget target, SmsTemplateInfo template,
                                  String channel, String from, String to, String sentBy) {
        SmsSendLog entry = SmsSendLog.builder()
                .targetId(target.getId())
                .chartNo(target.getChartNo())
                .name(target.getName())
                .templateCode(template.code())
                .templateLabel(template.label())
                .requestedChannel(channel)
                .fromNumber(from)
                .toNumber(to)
                .cycleBase(target.scheduleBase())
                .status(SmsSendLog.STATUS_PENDING)
                .sentAt(LocalDateTime.now())
                .sentBy(sentBy)
                .build();
        try {
            logRepository.saveAndFlush(entry);
            return Optional.of(entry.getId());
        } catch (DataIntegrityViolationException e) {
            log.info("이미 발송된 건이라 건너뜀: targetId={}, template={}", target.getId(), template.code());
            return Optional.empty();
        }
    }

    /** 실제 발송 결과를 기록한다. 접수 실패면 FAILED, 접수 성공이면 PENDING 유지(도달은 동기화가 확인). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(Long logId, SolapiSendService.SendOutcome outcome) {
        logRepository.findById(logId).ifPresent(entry ->
                entry.applyAcceptResult(
                        outcome.getMessageType(), outcome.getSolapiGroupId(),
                        outcome.getSolapiMessageId(), outcome.getStatusCode(),
                        outcome.isSuccess() ? SmsSendLog.STATUS_PENDING : SmsSendLog.STATUS_FAILED,
                        outcome.getFailReason()));
    }
}
