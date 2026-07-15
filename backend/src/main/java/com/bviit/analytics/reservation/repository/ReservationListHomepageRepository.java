package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.config.LegacyDataSourceConfig;
import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트_홈페이지 — 레거시 홈페이지 온라인 예약 소스 조회 (읽기 전용).
 *
 * <p>소스는 대시보드 DB 가 아니라 레거시 홈페이지 데이터다 → {@code legacyJdbcTemplate}.
 * {@code legacy.datasource.url} 이 없으면 DataSource 자체가 없으므로 이 빈도 함께 사라진다
 * (LegacyDataSourceConfig 와 동일 조건). 그 경우 컨트롤러가 503 을 준다.
 *
 * <p><b>제약</b>
 * <ul>
 *   <li>READ-ONLY — 이 소스에 쓰기를 하지 않는다(레거시 운영계 원본이다).
 *   <li>SQLite 방언. 기간 필터는 문자열 비교 + date() 반개구간이다 — SQL 파일 주석 참조.
 *   <li>컬럼명은 캐시의 snake_case 다. 레거시 원본(대문자)·legacy_raw(Postgres, 원본 대소문자)와
 *       다르니 어느 쪽을 보고 있는지 항상 확인할 것.
 * </ul>
 */
@Repository
@ConditionalOnExpression(LegacyDataSourceConfig.ENABLED_EXPRESSION)
public class ReservationListHomepageRepository {

    static final String LIST_SQL = "sql/reservation-list-homepage/reservation-list-homepage.sql";
    static final String SNAPSHOT_MAX_REG_DATE_SQL = "sql/reservation-list-homepage/snapshot-max-reg-date.sql";
    static final String MONTHLY_DEDUPED_SQL = "sql/reservation-list-homepage/monthly-deduped.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String listSql;
    private final String snapshotMaxRegDateSql;
    private final String monthlyDedupedSql;

    public ReservationListHomepageRepository(
            @Qualifier("legacyJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.listSql = SqlLoader.load(LIST_SQL);
        this.snapshotMaxRegDateSql = SqlLoader.load(SNAPSHOT_MAX_REG_DATE_SQL);
        this.monthlyDedupedSql = SqlLoader.load(MONTHLY_DEDUPED_SQL);
    }

    /** 등록일 from~to(양끝 포함) 구간의 온라인 예약 목록. */
    public List<Map<String, Object>> findList(String from, String to) {
        return jdbc.queryForList(listSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 월별 중복제외 홈페이지 예약 건수 — 월간 레포트의 온라인 예약(2026-06~) 구성요소 ③.
     *
     * <p>화면 목록과 조건이 다르다: 시력교정(exam_type='5')만, 전화번호 기준 중복제외.
     * 자세한 근거는 SQL 주석 참고.
     *
     * @return yr, mo, cnt 를 담은 행들(데이터가 없는 달은 행 자체가 없다)
     */
    public List<Map<String, Object>> findMonthlyDedupedCounts(String from, String to) {
        return jdbc.queryForList(monthlyDedupedSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /** 소스가 담고 있는 마지막 등록일시. 값이 없으면 빈 문자열. */
    public String findSnapshotMaxRegDate() {
        String value = jdbc.queryForObject(
                snapshotMaxRegDateSql, new MapSqlParameterSource(), String.class);
        return value == null ? "" : value;
    }
}
