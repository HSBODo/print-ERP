package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.ExamCountRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 검사수(월간 레포트 c-exam-count) 범위 조회 — EXAM 행수 + Cataract_Exam 세션수.
 * 실 데이터(MSSQL) 프로파일에서만 주입되며, 미연결 시 컨트롤러가 503으로 응답한다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ExamCountService {

    private final ExamCountRepository repository;

    @Transactional(readOnly = true)
    public Map<String, Object> getExamCount(String from, String to) {
        return repository.findExamCountRange(from, to);
    }
}
