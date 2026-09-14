package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.CataractExamListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 백내장 검사자 리스트 조회 서비스. 검사일(Cataract_Exam.EXAM_DATE) 범위로 행 목록 반환.
 * 진료구분·검색 등 세부 필터는 프론트에서 클라이언트 사이드로 처리.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractExamListService implements CataractExamListReader {

    private final CataractExamListRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCataractExamList(String from, String to) {
        return repository.findCataractExamList(from, to);
    }
}
