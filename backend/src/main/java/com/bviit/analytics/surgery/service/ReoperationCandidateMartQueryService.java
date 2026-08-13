package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.repository.ReoperationCandidateMartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 재수술 후보 — Postgres 마트에서 읽는다.
 *
 * postgres-mart 프로파일에서 @Primary 라 {@link ReoperationCandidateReader} 주입 시 이 구현이 선택된다.
 * 화면(수술자 리스트·재수술 검토 모달) 이 MSSQL(SSH 터널·VPN) 에 의존하지 않는다 — 터널이 끊겨도
 * 마지막 배치 적재분이 그대로 뜬다. 적재는 {@code SurgeryMartJob} 이 담당.
 */
@Service
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReoperationCandidateMartQueryService implements ReoperationCandidateReader {

    private final ReoperationCandidateMartRepository martRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCandidates(String from, String to) {
        return martRepository.findCandidates(from, to);
    }
}
