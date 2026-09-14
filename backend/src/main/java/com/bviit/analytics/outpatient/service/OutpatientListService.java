package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.outpatient.repository.OutpatientListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 외래수 리스트 조회 서비스. 예약일 범위(RESERVE_DATE) 기준으로 F/I,H 행 목록을 반환한다.
 * 진료구분·상태·검색 등 세부 필터는 프론트에서 클라이언트 사이드로 처리.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientListService implements OutpatientListReader {

    private final OutpatientListRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOutpatientList(String from, String to) {
        return repository.findOutpatientList(from, to);
    }
}
