package com.bviit.analytics.overall.service;

import com.bviit.analytics.overall.dto.OverallExamWeeklyItem;
import com.bviit.analytics.overall.repository.OverallExamMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 검사자 종합표 주간 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. OverallExamWeeklyReader 주입 시 자동 선택.
 * 서비스 계약과 동일하게 "데이터가 있는 주만" 반환 (zero-fill 없음 — 원본 서비스가 그대로).
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class OverallExamWeeklyMartQueryService implements OverallExamWeeklyReader {

    private final OverallExamMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<OverallExamWeeklyItem> getWeeklyStats(List<Integer> years) {
        return martRepository.findWeekly(years);
    }
}
