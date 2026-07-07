package com.bviit.analytics.exam.service;

import com.bviit.analytics.exam.repository.AllExamListMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 전체 검사자 리스트 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. AllExamListReader 주입 시 자동 선택.
 * list_exam + list_cataract_exam 를 UNION 으로 조회. exam-list / cataract-exam-list 페이지가
 * 사용하는 동일 마트를 재활용 → 별도 배치 불필요.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class AllExamListMartQueryService implements AllExamListReader {

    private final AllExamListMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllExamList(String from, String to) {
        return martRepository.findAllExamList(from, to);
    }
}
