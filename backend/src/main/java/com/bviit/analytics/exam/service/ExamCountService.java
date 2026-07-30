package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.ExamCountRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 검사수 범위 조회 — 마트(list_exam + list_cataract_exam) 원시 COUNT.
 * postgres-mart 프로파일에서만 주입되며, 미연결 시 컨트롤러가 503으로 응답한다.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamCountService {

    private final ExamCountRepository repository;

    @Transactional(readOnly = true)
    public Map<String, Object> getExamCount(String from, String to) {
        return repository.findExamCountRange(from, to);
    }
}
