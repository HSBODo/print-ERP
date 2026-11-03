package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트_홈페이지 — warehouse(raw.raw_homepage_tbl_counsel) 조회 (읽기 전용).
 *
 * <p>Phase 3 (2026-10-23) 로 레거시 홈페이지 MariaDB/SQLite 직결을 전면 제거하고
 * 데이터 플랫폼의 warehouse 하나만 조회한다. SSH 터널·MariaDB·SQLite 의존 없음.
 * SQL 은 전부 {@code sql/warehouse/homepage/*.sql} (Postgres 방언) 에서 로드한다.
 *
 * <p><b>제약</b>
 * <ul>
 *   <li>READ-ONLY — raw 테이블에 쓰기 없음.
 *   <li>결과 별칭 계약은 마트판({@link ReservationListHomepageMartRepository}) 과 동일해야 한다
 *       — 프론트 zod 와 1:1. 한쪽만 고치지 말 것.
 * </ul>
 */
@Repository
@Profile("postgres-mart")
public class ReservationListHomepageRepository implements HomepageOverallSource {

    private static final String SQL_BASE = "sql/warehouse/homepage/";

    private final NamedParameterJdbcTemplate jdbc;
    private final String listSql;
    private final String lastRegDateSql;
    private final String monthlyListRawSql;
    private final String dailyListRawSql;

    public ReservationListHomepageRepository(
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc
    ) {
        this.jdbc = warehouseJdbc;
        this.listSql           = SqlLoader.load(SQL_BASE + "select-reservation-list-homepage.sql");
        this.lastRegDateSql    = SqlLoader.load(SQL_BASE + "select-last-reg-date.sql");
        this.monthlyListRawSql = SqlLoader.load(SQL_BASE + "select-monthly-list-raw.sql");
        this.dailyListRawSql   = SqlLoader.load(SQL_BASE + "select-daily-list-raw.sql");
    }

    /** 등록일 from~to(양끝 포함) 구간의 온라인 예약 목록. */
    public List<Map<String, Object>> findList(String from, String to) {
        return jdbc.queryForList(listSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 월별 홈페이지 예약 건수 — 예약 종합의 온라인 예약(2026-06~) 구성요소 ③.
     *
     * <p>예약자 리스트_홈페이지 화면과 동일한 raw 건수(전 진료 · COUNT(*)) — 두 화면 정합.
     * 자세한 근거는 SQL 주석 참고.
     *
     * @return yr, mo, cnt 를 담은 행들(데이터가 없는 달은 행 자체가 없다)
     */
    @Override
    public List<Map<String, Object>> findMonthlyListRawCounts(String from, String to) {
        return jdbc.queryForList(monthlyListRawSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 일별 홈페이지 예약 건수 — 주차 레포트의 온라인 예약 구성요소 ③.
     * 월별판과 같은 필터·계산이고 버킷만 일 단위다.
     *
     * @return d, cnt 를 담은 행들(데이터가 없는 날은 행 자체가 없다)
     */
    @Override
    public List<Map<String, Object>> findDailyListRawCounts(String from, String to) {
        return jdbc.queryForList(dailyListRawSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 소스가 담고 있는 마지막 등록일시. 값이 없으면 빈 문자열.
     *
     * <p>warehouse 는 CDC 로 적재되므로 이 값이 '천장' — 그 이후 구간은 조용히 비어 나온다.
     * 화면이 조회 종료일과 비교해 경고 배너를 띄운다.
     */
    @Override
    public String findLastRegDate() {
        String value = jdbc.queryForObject(
                lastRegDateSql, new MapSqlParameterSource(), String.class);
        return value == null ? "" : value;
    }
}
