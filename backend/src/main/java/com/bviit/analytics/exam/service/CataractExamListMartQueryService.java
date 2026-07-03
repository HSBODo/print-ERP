package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.ExamStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 백내장 검사자 리스트 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. CataractExamListReader 주입 시 자동 선택.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class CataractExamListMartQueryService implements CataractExamListReader {

    private final ExamStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCataractExamList(String from, String to) {
        return martRepository.findCataractExamList(from, to);
    }
}
