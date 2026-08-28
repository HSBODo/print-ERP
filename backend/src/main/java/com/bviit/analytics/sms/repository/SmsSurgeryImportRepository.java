package com.bviit.analytics.sms.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 발송 대상 자동 등록 소스 — 마트 수술자 리스트(list_surgery) 조회.
 * postgres-mart 프로파일에서만 뜬다. H2 개발 프로파일에서는 빈이 없어
 * 자동 등록 API 가 503(미연결)으로 응답한다(SmsTargetService 의 ObjectProvider 처리).
 */
@Repository
@Profile("postgres-mart")
public class SmsSurgeryImportRepository {

    private static final String SELECT_SQL = SqlLoader.load("sql/sms/select-surgery-targets.sql");
    private static final String SELECT_BY_CHART_SQL = SqlLoader.load("sql/sms/select-surgery-by-chart.sql");

    private final NamedParameterJdbcTemplate jdbc;

    /** @Qualifier 는 생성자 파라미터에 단다 — 필드에 달면 Lombok 이 옮기지 않아 엉뚱한 DataSource 가 주입된다. */
    public SmsSurgeryImportRepository(@Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> findSurgeryRows(LocalDate from, LocalDate to) {
        return jdbc.queryForList(SELECT_SQL, new MapSqlParameterSource()
                .addValue("from", from.toString())
                .addValue("to", to.toString()));
    }

    /** 차트번호로 가장 최근 수술 1건. 없으면 빈 Optional. */
    public Optional<Map<String, Object>> findLatestByChartNo(String chartNo) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                SELECT_BY_CHART_SQL, new MapSqlParameterSource("chartNo", chartNo));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }
}
