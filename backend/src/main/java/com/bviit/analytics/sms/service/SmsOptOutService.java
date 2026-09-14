package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.dto.SmsOptOutRow;
import com.bviit.analytics.sms.entity.SmsOptOut;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsOptOutRepository;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 수신거부 등록·해제.
 *
 * 홀딩과 무엇이 다른가 — <b>홀딩은 그 수술 건 하나</b>를 막고, <b>수신거부는 그 사람</b>을 막는다.
 * 자동 적재는 새 수술이 생기면 새 행을 SENDABLE 로 만들기 때문에, 홀딩만으로는
 * "그만 보내주세요"라고 한 환자가 다음 수술 때 되살아난다.
 *
 * 등록하면 두 가지를 한다.
 *   ① 목록에 번호를 남긴다 — 앞으로 적재되는 행까지 막는다.
 *   ② 지금 목록에 있는 <b>같은 번호의 대상을 전부 홀딩</b>한다 — 이미 잡혀 있는 예정분을 멈춘다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsOptOutService {

    private final SmsOptOutRepository optOutRepository;
    private final SmsTargetRepository targetRepository;

    @Transactional(readOnly = true)
    public List<SmsOptOutRow> findAll() {
        return optOutRepository.findAllByOrderByCreatedAtDesc().stream().map(SmsOptOutRow::from).toList();
    }

    /**
     * 선택한 대상들의 번호를 수신거부로 올린다. 등록된 사람 수를 돌려준다.
     * 번호가 무효한 행은 건너뛴다 — 막을 번호 자체가 없다.
     */
    @Transactional
    public int registerByTargets(List<Long> targetIds, String actor) {
        LocalDateTime now = LocalDateTime.now();
        int registered = 0;
        for (SmsTarget target : targetRepository.findAllById(targetIds)) {
            String phone = SmsTarget.normalizePhone(target.getPhone());
            if (!SmsTarget.isValidPhone(phone)) continue;
            if (optOutRepository.existsByPhone(phone)) {
                holdSamePhone(phone, now);   // 목록엔 있는데 새 수술로 되살아난 경우
                continue;
            }
            optOutRepository.save(SmsOptOut.of(
                    phone, target.getChartNo(), target.getName(), SmsOptOut.SOURCE_MANUAL, actor, now));
            holdSamePhone(phone, now);
            registered++;
        }
        log.info("수신거부 등록: 요청={}건, 신규={}명, 처리자={}", targetIds.size(), registered, actor);
        return registered;
    }

    /**
     * 수신거부를 푼다. <b>홀딩은 자동으로 풀지 않는다</b> —
     * 목록에서 빠졌다고 지난 차수가 한꺼번에 나가면 곤란하다. 홀딩 해제는 사람이 따로 누른다.
     */
    @Transactional
    public boolean release(String rawPhone) {
        String phone = SmsTarget.normalizePhone(rawPhone);
        return optOutRepository.findByPhone(phone)
                .map(entry -> {
                    optOutRepository.delete(entry);
                    log.info("수신거부 해제: phone={}", mask(phone));
                    return true;
                })
                .orElse(false);
    }

    /**
     * id 로 해제 — 화면 관리 모달에서 사용. 목록 응답의 phone 은 마스킹돼 있어서 phone 대신 id 로 지운다.
     * 정책은 {@link #release(String)} 과 동일 (홀딩 유지, 물리 삭제).
     */
    @Transactional
    public boolean releaseById(Long id) {
        return optOutRepository.findById(id)
                .map(entry -> {
                    optOutRepository.delete(entry);
                    log.info("수신거부 해제(by id): id={}, phone={}", id, mask(entry.getPhone()));
                    return true;
                })
                .orElse(false);
    }

    private void holdSamePhone(String phone, LocalDateTime now) {
        targetRepository.findByPhone(phone).stream()
                .filter(SmsTarget::isSendable)
                .forEach(t -> t.changeStatus(SmsTarget.STATUS_HOLD, now));
    }

    /** 로그에는 전체 번호를 남기지 않는다. */
    private static String mask(String phone) {
        return phone.length() < 8 ? "***" : phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
