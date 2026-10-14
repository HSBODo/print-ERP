package com.bviit.analytics.etc.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 드림렌즈 장부 자동 초안 원천 조회 — CRM(MSSQL) 렌즈센터(D) 내원 + 수납.
 *
 * 소스·검증 근거는 SQL 파일 헤더 주석 참고 (2026-08-05 prod 실측으로 시드 장부와 대조 완료).
 *
 * <p><b>소스 라우팅 (data-platform 프로파일 · 2026-09-30 Phase 2)</b>
 * <ul>
 *   <li>기본: CRM 직접연결 (statsJdbcTemplate) + IPLUS.PAOSUNAB 링크드서버 OPENQUERY.</li>
 *   <li>data-platform 활성: 웨어하우스 (warehouseJdbcTemplate) + raw.raw_emr_paosunab JOIN.</li>
 * </ul>
 *
 * READ-ONLY — SELECT 만 실행. 원격 서버 장애 시 이 조회 전체가 실패할 수 있어 호출측이 격리한다.
 */
@Repository
@Profile("postgres-mart")
public class DreamlensLedgerDraftRepository {

    static final String DRAFT_MSSQL = "sql/softcrm/etc/select-dreamlens-ledger-draft.sql";
    static final String DRAFT_WAREHOUSE = "sql/warehouse/etc/select-dreamlens-ledger-draft.sql";

    private final NamedParameterJdbcTemplate jdbc;
    private final String draftSql;

    public DreamlensLedgerDraftRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate statsJdbc,
            @Qualifier("warehouseJdbcTemplate") NamedParameterJdbcTemplate warehouseJdbc,
            @Value("${data-platform.enabled:false}") boolean dataPlatformEnabled
    ) {
        this.jdbc = dataPlatformEnabled ? warehouseJdbc : statsJdbc;
        this.draftSql = SqlLoader.load(dataPlatformEnabled ? DRAFT_WAREHOUSE : DRAFT_MSSQL);
    }

    /**
     * 기간 내 렌즈센터 내원 1건당 1행.
     * 컬럼: entryDate, customerNo, customerName, visitTypeRaw, examiner, lensRevenue, treatmentRevenue
     */
    public List<Map<String, Object>> findDraftRows(LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", from.toString())
                .addValue("to", to.toString());
        return jdbc.queryForList(draftSql, params);
    }
}
