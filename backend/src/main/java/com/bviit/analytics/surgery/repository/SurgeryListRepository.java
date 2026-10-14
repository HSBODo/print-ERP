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
 * 수술자 리스트 — 실제 수술일 기준 행 목록.
 *
 * 기준일: 수술일자(OPERATIONDATA.OPERATION_DATE, Cataract_Operationdata R/L 수술일)
 * 보조일: 검사일자(EXAM.EXAM_DATE, Cataract_Exam.EXAM_DATE)
 *
 * MSSQL 2014 호환: STRING_AGG, TRIM 사용 금지.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + SQL {@link #SQL_MSSQL}.</li>
 *   <li>data-platform 활성: 데이터 플랫폼 (warehouseJdbcTemplate) + SQL {@link #SQL_WAREHOUSE}. Postgres 방언
 *       (OUTER APPLY → LATERAL, CTE, 문자열 + → ||, LEN → LENGTH, MSSQL money → TO_CHAR 통화 포맷).</li>
 * </ul>
 *
 * <p>정본 전략: {@code docs/data-platform/migration-strategy.md}. 이관 이력: 2026-09-29 A4-2.
 */
@Repository
@Profile("postgres-mart")
public class SurgeryListRepository {

    static final String SQL_MSSQL = "sql/softcrm/surgery/select-surgery-list.sql";
    static final String SQL_WAREHOUSE = "sql/warehouse/surgery/select-surgery-list.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String findSurgeryListSql;

    public SurgeryListRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.findSurgeryListSql = SqlLoader.load(
                dataPlatformEnabled ? SQL_WAREHOUSE : SQL_MSSQL);
    }

    public List<Map<String, Object>> findSurgeryList(String from, String to) {
        return jdbc.queryForList(findSurgeryListSql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
