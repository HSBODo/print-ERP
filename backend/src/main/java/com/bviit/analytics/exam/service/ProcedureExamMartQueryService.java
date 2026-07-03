package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 검사수(procedure-exam) 월별 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. ProcedureExamStatsReader 주입 시 자동 선택.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ProcedureExamMartQueryService implements ProcedureExamStatsReader {

    private final ExamStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProcedureExamMonthlyItem> getMonthlyStats(List<Integer> years) {
        return martRepository.findProcedureExamMonthly(years);
    }
}
