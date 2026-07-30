package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.ExamCountRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 고객분류별 검사수(월간 레포트 도표 #7) 조회 — 세션(EXAM 행 + Cataract_Exam 행) 기준.
 * 실 데이터(MSSQL) 프로파일에서만 주입되며, 미연결 시 컨트롤러가 503으로 응답한다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ExamCountService {

    private final ExamCountRepository repository;

    /** 고객분류별 검사수 — (월 × 내원동기(레포트)) 집계. 월간 레포트 도표 #7. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExamCountByClassMonthly(String from, String to) {
        return repository.findExamCountByClassMonthly(from, to);
    }
}
