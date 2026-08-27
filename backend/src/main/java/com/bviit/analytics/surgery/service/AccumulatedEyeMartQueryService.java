package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.dto.AccumulatedEyeRow;
import com.bviit.analytics.surgery.repository.AccumulatedEyeMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 누적 안수 리스트 조회 — Postgres 마트에서 직접 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary. 컨트롤러가 {@link AccumulatedEyeReader} 를 주입할 때
 * 이 구현이 우선. MSSQL 터널이 끊겨도 마지막 적재분이 화면에 그대로 뜬다.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class AccumulatedEyeMartQueryService implements AccumulatedEyeReader {

    private final AccumulatedEyeMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AccumulatedEyeRow> getAccumulatedEyes(String from, String to, String query, String field) {
        return martRepository.findList(from, to, query, field);
    }
}
