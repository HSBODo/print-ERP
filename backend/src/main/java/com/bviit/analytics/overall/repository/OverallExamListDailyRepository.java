package com.bviit.analytics.overall.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사자 종합지표 일별 집계 — v_all_exam_list(V56 확장) 재집계.
 *
 * 종전 {@code OverallExamWeeklyRepository}(MSSQL 6종 SQL) 를 대체해 배치가 MSSQL 을 붙지 않고
 * Postgres 뷰에서 모든 지표를 한 번에 뽑는다. 자바 쪽 주 버킷팅 로직은
 * {@code OverallExamListAggregator} 가 그대로 이어받는다.
 *
 * 반환 shape (한 row = 한 날짜):
 *   d, popTotal, cataractSessions,
 *   jobOffice/Student/Etc, introGeneral/Customer/Staff,
 *   visionExam, visionBooked, cataractOnly, cataractBooked,
 *   dreamlens, stopCount, oneDay, oneDayBooked
 *
 * MSSQL 직결 {@code OverallExamWeeklyRepository} 는 mssql 단독 프로파일 및 대사(reconcile) 용도로 유지.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverallExamListDailyRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/mart/select-overall-exam-daily-agg.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findOverallExamDailyAgg(String from, String to) {
        return jdbc.queryForList(SELECT_SQL, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
