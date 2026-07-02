package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.repository.SurgeryListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 수술자 리스트 조회 서비스. 날짜 범위(수술일) 기준으로 행 목록을 반환한다.
 */
@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class SurgeryListService {

    private final SurgeryListRepository repository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSurgeryList(String from, String to) {
        return repository.findSurgeryList(from, to);
    }
}
