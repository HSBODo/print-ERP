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
import java.util.Optional;

/**
 * 예약자 리스트_홈페이지 마트 적재 잡.
 *
 * <p>레거시 홈페이지 MariaDB(TBL_COUNSEL) → {@code mart_list_reservation_homepage} 적재.
 * 다른 리스트 마트({@link ReservationMartJob#replaceList}, ExamMartJob 등) 와 동일한 패턴:
 * 범위 delete + insert 로 취소·수정분까지 흡수한다.
 *
 * <h2>왜 이 잡만 별도 클래스인가</h2>
 * 소스가 CRM(MSSQL) 이 아니라 레거시 홈페이지(MariaDB) 다. 다른 예약 마트 잡들은 MSSQL 소스라
 * {@link ReservationMartJob} 하나로 묶이지만, 이건 데이터소스가 달라 트랜잭션·의존성이 갈린다.
 *
 * <h2>소스 미설정 시</h2>
 * {@code homepage.datasource.url} 이 없으면 {@link ReservationListHomepageRepository} 빈이 없다
 * (HomepageDataSourceConfig 조건). Optional 로 받아 로그만 남기고 skip — 배치 전체가 실패하지 않게.
 *
 * <p>관련 문서: docs/databatch/legacy-homepage-source-strategy.md §3
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReservationListHomepageMartJob {

    static final String MART_NAME = "reservation_list_homepage";

    /** 레거시 소스(MariaDB) 리더. 소스 미설정이면 비어 있어 skip 한다. */
    private final Optional<ReservationListHomepageRepository> sourceRepository;
    private final ReservationListHomepageMartWriter writer;
    private final BatchSuccessLogRepository successLogRepository;

    /**
     * from..to 등록일 범위를 적재한다. 반환값은 insert 된 행 수(관측용, table_stats 에 실린다).
     *
     * <p>트랜잭션: 마트 write 는 all-or-nothing. MariaDB 읽기는 별도 datasource 이므로 이 트랜잭션
     * 밖에서 미리 수행한다.
     */
    @Transactional
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("ReservationListHomepageMartJob start: range={}..{}", from, to);

        if (sourceRepository.isEmpty()) {
            log.warn("ReservationListHomepageMartJob skip — homepage.datasource.url 미설정. "
                    + "마트 적재 없음 (소스 없어 배치가 자연 skip). range={}..{}", from, to);
            return Map.of("mart_list_reservation_homepage", 0);
        }

        // 1) 소스에서 범위 조회 — MariaDB direct. 캐시(SQLite)와 결과 계약이 동일해 어느 쪽이든 동작한다.
        List<Map<String, Object>> rows = sourceRepository.get()
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
