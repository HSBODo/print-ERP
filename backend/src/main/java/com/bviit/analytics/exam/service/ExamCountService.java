package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.ExamCountRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 고객분류별 검사수(월간 레포트 도표 #7) — <b>MSSQL 직결</b> 집계. 세션(EXAM 행 + Cataract_Exam 행) 기준.
 *
 * postgres-mart 프로파일에서는 {@link ExamCountMartQueryService} 가 @Primary 라 화면 조회는 마트가 담당하고,
 * 이 구현은 {@code ReportMartJob} 의 적재 소스로만 쓰인다(운영 DB 부하·터널 의존을 배치 시간대로 몰기 위함).
 * mssql 단독 프로파일에서는 이 구현이 유일해 화면도 직접 사용한다.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamCountService implements ExamCountReader {

    private final ExamCountRepository repository;

    /** 고객분류별 검사수 — (월 × 내원동기(레포트)) 집계. 월간 레포트 도표 #7. */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExamCountByClassMonthly(String from, String to) {
        return repository.findExamCountByClassMonthly(from, to);
    }
}
