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
 * 누적 안수 원천 직결 조회 — {@link com.bviit.analytics.batch.job.AccumulatedEyeMartJob} 의 배치 read-side.
 *
 * <p>화면은 마트({@link AccumulatedEyeMartRepository})를 읽는다. 이 리포지토리는
 * D-1/monthly-reconcile 재적재 시에만 호출.
 *
 * <p><b>소스 라우팅 (data-platform 프로파일)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate, MSSQL SOFTCRM.OPERATION_ACCUMULATED_EYE_COUNT)
 *       + SQL {@link #SQL_MSSQL}.</li>
 *   <li>data-platform 프로파일 활성: 데이터 플랫폼 (warehouseJdbcTemplate,
 *       bnviit_datawarehouse.raw.raw_crm_operation_accumulated_eye_count) + SQL {@link #SQL_WAREHOUSE}. Postgres 방언.</li>
 * </ul>
 *
 * <p>정본 전략: {@code docs/data-platform/migration-strategy.md}.
 * 이관 이력: 2026-09-29 A2 — accumulated-eye 배치 파이프라인 웨어하우스 → 마트로 스위치.
 */
@Repository
@Profile("postgres-mart")
public class AccumulatedEyeSourceRepository {

    static final String SQL_MSSQL = "sql/softcrm/surgery/select-accumulated-eyes.sql";
    static final String SQL_WAREHOUSE = "sql/warehouse/surgery/select-accumulated-eyes.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String selectSql;

    public AccumulatedEyeSourceRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.selectSql = SqlLoader.load(dataPlatformEnabled ? SQL_WAREHOUSE : SQL_MSSQL);
    }

    /** from..to (operation_date 반개구간) 원천 조회. camelCase 별칭 그대로 반환 — Writer 가 :바인딩. */
    public List<Map<String, Object>> findRange(String from, String to) {
        return jdbc.queryForList(
                selectSql,
                new MapSqlParameterSource()
                        .addValue("from", from)
                        .addValue("to", to)
        );
    }
}
