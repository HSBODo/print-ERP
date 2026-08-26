package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트_홈페이지 — Postgres 마트에서 조회.
 *
 * <p>postgres-mart 프로파일에서만 존재한다. 앱 조회 시점에 MariaDB 로 붙지 않고
 * {@code mart_list_reservation_homepage} 만 읽는다(strategy §3-2).
 *
 * <p>결과 별칭 계약은 소스판({@link ReservationListHomepageRepository}) 과 동일해야 한다 —
 * 프론트 zod 스키마와 1:1. 한쪽만 고치지 말 것.
 *
 * <p><b>{@code @Primary}</b> — postgres-mart 에서 두 구현이 모두 {@link HomepageOverallSource} 로
 * 노출되므로(레거시 소스판 + 마트판), Optional 이 마트 쪽으로 해결되도록 우선순위 부여.
 * {@link com.bviit.analytics.reservation.service.ReservationOverallStatsService} 배치 계산이
 * 이 마트를 읽어 종합 마트({@code mart_reservation_overall_monthly}) 를 upsert 한다.
 */
@Repository
@Profile("postgres-mart")
@Primary
@RequiredArgsConstructor
public class ReservationListHomepageMartRepository implements HomepageOverallSource {

    private static final String LIST_SQL             = SqlLoader.load("sql/mart/select-list-reservation-homepage.sql");
    private static final String LAST_REG_DATE_SQL    = SqlLoader.load("sql/mart/select-list-reservation-homepage-last-reg-date.sql");
    private static final String MONTHLY_LIST_RAW_SQL = SqlLoader.load("sql/mart/select-list-reservation-homepage-monthly-list-raw.sql");
    private static final String DAILY_LIST_RAW_SQL   = SqlLoader.load("sql/mart/select-list-reservation-homepage-daily-list-raw.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /** 등록일 from~to(양끝 포함) 구간의 온라인 예약 목록 — 마트 조회. */
    public List<Map<String, Object>> findList(String from, String to) {
        return jdbc.queryForList(LIST_SQL, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 월별 홈페이지 예약 건수 — 예약자 리스트_홈페이지 화면과 동일한 raw 건수 (전 진료 · COUNT(*)).
     * 배치가 이미 CATEGORY·DEL_TF 필터를 적용해 마트에 넣었기 때문에 여기서는 재적용하지 않는다.
     */
    @Override
    public List<Map<String, Object>> findMonthlyListRawCounts(String from, String to) {
        return jdbc.queryForList(MONTHLY_LIST_RAW_SQL, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /** 일별 홈페이지 예약 건수 — 주차 레포트용. 월별판과 같은 raw 건수를 일 단위로 묶은 것. */
    @Override
    public List<Map<String, Object>> findDailyListRawCounts(String from, String to) {
        return jdbc.queryForList(DAILY_LIST_RAW_SQL, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }

    /**
     * 마트가 담고 있는 마지막 등록일시. 배치 이관 후에는 '마지막 배치 시점의 원본 max' 로,
     * 스냅샷과 같은 '천장' 의미를 갖는다 — 그 이후 구간은 조용히 비어 나온다.
     * 화면이 조회 종료일과 비교해 경고 배너를 띄운다.
     */
    @Override
    public String findLastRegDate() {
        String value = jdbc.queryForObject(
                LAST_REG_DATE_SQL, new MapSqlParameterSource(), String.class);
        return value == null ? "" : value;
    }
}
