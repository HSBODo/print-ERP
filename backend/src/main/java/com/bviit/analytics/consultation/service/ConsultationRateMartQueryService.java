package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.repository.ConsultationStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 전환율 월별 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. ConsultationRateReader 주입 시 자동 선택.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ConsultationRateMartQueryService implements ConsultationRateReader {

    private final ConsultationStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ConsultationRateItem> getMonthlyRates(List<Integer> years) {
        return martRepository.findConsultationRateMonthly(years);
    }
}
