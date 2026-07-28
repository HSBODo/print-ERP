package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.repository.ReoperationCandidateRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 재수술 후보 조회 — RE_OPERATION 원본 행 + 자동판정(포함/제외)·제외사유.
 *
 * 월간 레포트 재수술 건수의 자동 집계 기준을, 담당자가 행 단위로 검토/보정하기 위한 읽기 전용 목록.
 * 실 데이터(MSSQL) 프로파일에서만 주입되며, 미연결 시 컨트롤러가 503으로 응답한다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class ReoperationCandidateService {

    private final ReoperationCandidateRepository repository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCandidates(String from, String to) {
        return repository.findCandidates(from, to);
    }
}
