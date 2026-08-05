package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.surgery.entity.ReoperationDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReoperationDecisionRepository extends JpaRepository<ReoperationDecision, Long> {

    List<ReoperationDecision> findByOpDateBetween(LocalDate from, LocalDate to);

    Optional<ReoperationDecision> findByChartNoAndOpDateAndAgainRAndAgainL(
            String chartNo, LocalDate opDate, String againR, String againL);
}
