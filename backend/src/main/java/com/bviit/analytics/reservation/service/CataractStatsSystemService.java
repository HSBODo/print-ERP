package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.repository.CataractStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 예약통계_백내장 — MSSQL 라이브 조회. 배치의 원본 read 전용.
 * 사용자 조회 경로는 QueryService → Mart Repository.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class CataractStatsSystemService {

    private final CataractStatsSystemRepository repository;

    @Transactional(readOnly = true)
    public List<CataractStatsDailyRow> getDailyCounts(String from, String to) {
        return repository.findDailyCounts(from, to);
    }
}
