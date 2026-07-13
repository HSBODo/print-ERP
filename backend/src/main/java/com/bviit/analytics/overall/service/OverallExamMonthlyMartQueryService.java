package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamMonthlyItem;
import com.bviit.analytics.overall.repository.OverallExamMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 검사자 종합표 월간 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. OverallExamMonthlyReader 주입 시 자동 선택.
 * 서비스 계약과 동일하게 "데이터가 있는 월만" 반환. 24·25 는 V14+V16 시드로 채워져 있음.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class OverallExamMonthlyMartQueryService implements OverallExamMonthlyReader {

    private final OverallExamMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<OverallExamMonthlyItem> getMonthlyStats(List<Integer> years) {
        return martRepository.findMonthly(years);
    }
}
