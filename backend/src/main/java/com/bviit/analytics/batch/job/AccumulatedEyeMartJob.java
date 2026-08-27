package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.surgery.repository.AccumulatedEyeSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 누적 안수 리스트 마트 적재 잡.
 *
 * <p>MSSQL {@code OPERATION_ACCUMULATED_EYE_COUNT} → {@code list_accumulated_eyes}.
 * 다른 리스트 마트 잡(수술자 리스트 · 검사자 리스트 · 예약자 리스트 홈페이지) 과 동형:
 * range delete + insert 로 소급 수정·삭제분까지 흡수한다.
 *
 * <h2>소급 흡수</h2>
 * 매일 03:00 스케줄러는 D-1 만 재적재 → 매월 1일 03:30 monthly-reconcile 이 전월 전체를 재적재.
 * 30일 이상 소급 변동이 자주 있으면 monthly-reconcile 주기·범위를 조정한다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class AccumulatedEyeMartJob {

    static final String MART_NAME = "accumulated_eyes";

    private final AccumulatedEyeSourceRepository sourceRepository;
    private final AccumulatedEyeMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    /**
     * 트랜잭션: 마트 write 는 all-or-nothing. MSSQL 읽기는 별도 datasource 라
     * 이 트랜잭션과 무관 — 트랜잭션 밖에서 먼저 수행.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("AccumulatedEyeMartJob start: range={}..{}", from, to);

        // 1) MSSQL 원천에서 range 조회
        List<Map<String, Object>> rows = sourceRepository.findRange(from.toString(), to.toString());

        // 2) 마트 delete + insert (소급 수정·삭제분 흡수)
        int inserted = writer.replaceList(from, to, rows);

        // 3) 성공 로그 갱신
        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of("list_accumulated_eyes", inserted);
        log.info("AccumulatedEyeMartJob done: {}", stats);
        return stats;
    }
}
