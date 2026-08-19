package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.ExamCountMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 고객분류별 검사수 — Postgres 마트에서 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary 라 {@link ExamCountReader} 주입 시 이 구현이 선택된다.
 * 적재는 {@code ReportMartJob} 이 {@link com.bviit.analytics.exam.repository.ExamCountMartRepository#aggregateFromList(int)}
 * (v_all_exam_list.motive_report 재집계 · MSSQL 미접근) 을 호출해 수행한다.
 * {@link ExamCountService} 는 mssql 단독 프로파일 및 대사(reconcile) 용도로만 유지.
 *
 * 컨트롤러가 넘기는 from/to 는 한 해 전체(1/1~12/31)라 연도만 사용한다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ExamCountMartQueryService implements ExamCountReader {

    private final ExamCountMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExamCountByClassMonthly(String from, String to) {
        return martRepository.findExamCountByClassMonthly(Integer.parseInt(from.substring(0, 4)));
    }
}
