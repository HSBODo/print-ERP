package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.repository.ReoperationCandidateRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 재수술 후보 조회 — RE_OPERATION 원본 행 + 자동판정(포함/제외)·제외사유. MSSQL 직결.
 *
 * postgres-mart 프로파일에서는 {@link ReoperationCandidateMartQueryService} 가 @Primary 로
 * 우선 선택되고 이 구현은 대사(reconcile)·mssql 단독 프로파일에서만 쓰인다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReoperationCandidateService implements ReoperationCandidateReader {

    private final ReoperationCandidateRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCandidates(String from, String to) {
        return repository.findCandidates(from, to);
    }
}
