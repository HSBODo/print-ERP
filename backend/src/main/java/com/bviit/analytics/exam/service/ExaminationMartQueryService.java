package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 검사 월별 통계 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 ExaminationStatsReader를 주입하면
 * MSSQL 버전(ExaminationStatsService)보다 이 구현체가 우선 선택된다.
 *
 * 응답 shape은 ExaminationStatsService.getMonthlyStats와 동일해야 함
 * (ExamReconcileService가 두 소스 값 일치를 검증).
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ExaminationMartQueryService implements ExaminationStatsReader {

    private final ExamStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ExaminationMonthlyItem> getMonthlyStats(List<Integer> years) {
        return martRepository.findExaminationMonthly(years);
    }
}
