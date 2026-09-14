package com.bviit.analytics.sms.repository;

import com.bviit.analytics.sms.entity.SmsOptOut;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * 수신거부 목록 — 발송 직전과 자동 적재 두 곳에서 이 표만 본다.
 * 등록 경로가 늘어도(080 동기화 등) 차단 로직은 그대로 재사용된다.
 */
public interface SmsOptOutRepository extends JpaRepository<SmsOptOut, Long> {

    boolean existsByPhone(String phone);

    Optional<SmsOptOut> findByPhone(String phone);

    /** 목록 화면·적재 배치가 여러 번호를 한 번에 확인할 때. */
    List<SmsOptOut> findByPhoneIn(Collection<String> phones);

    List<SmsOptOut> findAllByOrderByCreatedAtDesc();
}
