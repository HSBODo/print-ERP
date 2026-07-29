package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.outpatient.repository.OutpatientListMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 외래수 리스트 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. OutpatientListReader 주입 시 자동 선택되어
 * MSSQL 직결 서비스(OutpatientListService)보다 우선 선택된다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class OutpatientListMartQueryService implements OutpatientListReader {

    private final OutpatientListMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOutpatientList(String from, String to) {
        return martRepository.findOutpatientList(from, to);
    }
}
