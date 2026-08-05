package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.config.HomepageDataSourceConfig;
import com.bviit.analytics.common.config.HomepageSourceDialect;
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
 * <p>소스는 대시보드 DB 가 아니라 레거시 홈페이지 데이터다 → {@code homepageJdbcTemplate}.
 * {@code homepage.datasource.url} 이 없으면 DataSource 자체가 없으므로 이 빈도 함께 사라진다
 * (HomepageDataSourceConfig 와 동일 조건). 그 경우 컨트롤러가 503 을 준다.
 *
 * <p><b>제약</b>
 * <ul>
 *   <li>READ-ONLY — 이 소스에 쓰기를 하지 않는다(레거시 운영계 원본이다).
 *   <li>소스가 둘이라 <b>SQL 세트도 둘</b>이다 — {@link HomepageSourceDialect} 가 URL 로 판별해 고른다.
 *       같은 데이터인데 스키마가 다르다(캐시가 원본을 snake_case 로 개명해 적재했다):
 *       스냅샷은 {@code consultations.legacy_no}, 운영 DB 는 {@code TBL_COUNSEL.C_NO} 다.
 *       한쪽 SQL 을 다른 쪽에 그대로 쓰면 'no such column' 이 난다.
 *   <li>두 세트의 <b>결과 별칭 계약은 동일</b>해야 한다(프론트 zod 와 1:1). 한쪽만 고치지 말 것.
 * </ul>
 */
@Repository
@ConditionalOnExpression(HomepageDataSourceConfig.ENABLED_EXPRESSION)
public class ReservationListHomepageRepository implements HomepageOverallSource {

    private static final String SQL_BASE = "sql/reservation-list-homepage/";

    private final NamedParameterJdbcTemplate jdbc;
    private final HomepageSourceDialect dialect;
    private final String listSql;
    private final String lastRegDateSql;
    private final String monthlyListRawSql;
    private final String dailyListRawSql;

    public ReservationListHomepageRepository(
            @Qualifier("homepageJdbcTemplate") NamedParameterJdbcTemplate jdbc,
            @Qualifier("homepageSourceDialect") HomepageSourceDialect dialect
    ) {
        this.jdbc = jdbc;
        this.dialect = dialect;
        this.listSql = SqlLoader.load(sqlPath(dialect, "reservation-list-homepage.sql"));
        this.lastRegDateSql = SqlLoader.load(sqlPath(dialect, "last-reg-date.sql"));
        this.monthlyListRawSql = SqlLoader.load(sqlPath(dialect, "monthly-list-raw.sql"));
        this.dailyListRawSql = SqlLoader.load(sqlPath(dialect, "daily-list-raw.sql"));
    }

    /** sql/reservation-list-homepage/{sqlite|mariadb}/{fileName} */
    static String sqlPath(HomepageSourceDialect dialect, String fileName) {
        return SQL_BASE + dialect.sqlDir() + "/" + fileName;
    }

    /** 현재 소스의 방언 — Service 가 live 여부(경고 배너 on/off)를 판단하는 데 쓴다. */
    public HomepageSourceDialect dialect() {
        return dialect;
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
     * <p>스냅샷이면 이 값이 곧 '천장'이다(이후 구간은 조용히 빈다). 실시간이면 그냥 최신 등록건
     * 시각이다 — 의미가 갈리므로 호출부는 {@link #dialect()}{@code .live()} 를 함께 봐야 한다.
     */
    @Override
    public String findLastRegDate() {
        String value = jdbc.queryForObject(
                lastRegDateSql, new MapSqlParameterSource(), String.class);
        return value == null ? "" : value;
    }
}
