package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.AllExamListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 전체 검사자 리스트 조회 서비스 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 행 목록.
 * 검사구분·내원동기·직업 토글의 조회건수가 월별 검사자 종합지표(검사유입·검사수)와 정합한다.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AllExamListService implements AllExamListReader {

    private final AllExamListRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllExamList(String from, String to) {
        return repository.findAllExamList(from, to);
    }
}
