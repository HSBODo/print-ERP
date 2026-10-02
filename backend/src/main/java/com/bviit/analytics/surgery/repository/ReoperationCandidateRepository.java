package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 재수술 후보 — RE_OPERATION 원본 행 + 자동판정(포함/제외)·제외사유.
 *
 * 기준일: 재수술일(RE_OPERATION.REOP_DATE)
 * SurgeryStatsService 의 재수술 카운트 원천이자, 재수술 검토 모달의 조회 소스.
 * laser/lens 분류는 자바(ReoperationOverlay) 에서 시술명 패턴으로 담당한다.
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 사용 금지.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + SQL {@link #SQL_MSSQL}.</li>
 *   <li>data-platform 활성: 데이터 플랫폼 (warehouseJdbcTemplate) + SQL {@link #SQL_WAREHOUSE}. Postgres 방언.</li>
 * </ul>
 *
 * <p>정본 전략: {@code docs/data-platform/migration-strategy.md}. 이관 이력: 2026-09-29 A4-1.
 */
@Repository
@Profile("postgres-mart")
public class ReoperationCandidateRepository {

    static final String SQL_MSSQL = "sql/softcrm/surgery/select-reoperation-candidates.sql";
    static final String SQL_WAREHOUSE = "sql/warehouse/surgery/select-reoperation-candidates.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String findReoperationCandidatesSql;

    public ReoperationCandidateRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.findReoperationCandidatesSql = SqlLoader.load(
                dataPlatformEnabled ? SQL_WAREHOUSE : SQL_MSSQL);
    }

    public List<Map<String, Object>> findCandidates(String from, String to) {
        return jdbc.queryForList(findReoperationCandidatesSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
