package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.repository.SurgeryStatsMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 수술자 리스트 조회 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 SurgeryListReader를 주입할 때
 * MSSQL 버전보다 이 구현체가 우선 선택된다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class SurgeryListMartQueryService implements SurgeryListReader {

    private final SurgeryStatsMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSurgeryList(String from, String to) {
        return martRepository.findList(from, to);
    }
}
