package com.bviit.analytics.sms.repository;

import com.bviit.analytics.sms.entity.SmsTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * ⚠️ 여기에는 SQL 텍스트 블록을 두지 않는다(RepositorySqlResourceCoverageTest 가 막는다).
 *    필요한 조건은 전부 파생 쿼리로 표현한다 — 이 표들은 JPA 가 소유하는 엔티티라 그게 가능하다.
 */
public interface SmsTargetRepository extends JpaRepository<SmsTarget, Long> {

    List<SmsTarget> findBySurgeryDateBetweenOrderBySurgeryDateAscIdAsc(LocalDate from, LocalDate to);

    /**
     * 발송예정일 기준 조회 — 수술일이 아니라 **기준일**을 본다(재조정되면 둘이 달라진다).
     * schedule_base 는 V52 가 기존 행까지 채우고 신규는 stampCreated 가 채우므로 null 이 없다.
     */
    List<SmsTarget> findByScheduleBaseBetweenOrderBySurgeryDateAscIdAsc(LocalDate from, LocalDate to);

    boolean existsByChartNoAndSurgeryDate(String chartNo, LocalDate surgeryDate);

    Optional<SmsTarget> findByChartNoAndSurgeryDate(String chartNo, LocalDate surgeryDate);

    /** 수신거부 등록 시 <b>같은 번호의 모든 대상</b>을 함께 홀딩하려고 쓴다 — 거부는 사람 단위다. */
    List<SmsTarget> findByPhone(String phone);
}
