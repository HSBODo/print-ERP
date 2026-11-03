package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.reservation.repository.ReservationListHomepageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트_홈페이지 마트 적재 잡.
 *
 * <p>warehouse {@code raw.raw_homepage_tbl_counsel} → {@code mart_list_reservation_homepage} 적재.
 * 다른 리스트 마트({@link ReservationMartJob#replaceList}, ExamMartJob 등) 와 동일한 패턴:
 * 범위 delete + insert 로 취소·수정분까지 흡수한다.
 *
 * <h2>왜 이 잡만 별도 클래스인가</h2>
 * 소스 테이블이 다른 예약 도메인(RESERVATION) 과 분리된 홈페이지 상담 테이블이라, 트랜잭션·범위
 * 계산이 독립이다. 2026-10-23 Phase 3 이후 소스는 warehouse Postgres 하나로 통일되어 다른
 * 리스트 마트 잡들과 데이터소스가 같아졌지만, 쿼리·필터가 홈페이지 전용이라 클래스는 유지한다.
 *
 * <p>관련 문서: docs/data-platform/external-db-decommission.md
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationListHomepageMartJob {

    static final String MART_NAME = "reservation_list_homepage";

    private final ReservationListHomepageRepository sourceRepository;
    private final ReservationListHomepageMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    /**
     * from..to 등록일 범위를 적재한다. 반환값은 insert 된 행 수(관측용, table_stats 에 실린다).
     *
     * <p>트랜잭션: 마트 write 는 all-or-nothing. warehouse 읽기도 같은 Postgres 이지만 별도
     * datasource(JdbcTemplate) 이므로 이 트랜잭션 밖에서 수행한다.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReservationListHomepageMartJob start: range={}..{}", from, to);

        // 1) warehouse 에서 범위 조회 — raw.raw_homepage_tbl_counsel (Postgres)
        List<Map<String, Object>> rows = sourceRepository
                .findList(from.toString(), to.toString());

        // 2) 마트 delete + insert
        int inserted = writer.replaceList(from, to, rows);

        // 3) 성공 로그 갱신 (성공 시에만)
        successLogRepository.upsert(MART_NAME, to);

        Map<String, Integer> stats = Map.of("mart_list_reservation_homepage", inserted);
        log.info("ReservationListHomepageMartJob done: {}", stats);
        return stats;
    }
}
