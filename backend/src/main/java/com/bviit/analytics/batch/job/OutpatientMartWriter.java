package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.outpatient.dto.OutpatientCountMonthlyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.util.List;

/**
 * 외래 도메인 마트 write 컴포넌트 — PR-10.
 *
 * mart_outpatient_count_monthly upsert. outpatient_count/total은 null 저장 가능
 * (서비스가 2026 미확인 월은 null로 반환 → 마트에도 그대로 저장).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OutpatientMartWriter {

    private static final String UPSERT_SQL = SqlLoader.load("sql/mart/upsert-outpatient-count-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertMonthly(List<OutpatientCountMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(OutpatientMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_SQL, batch);
        int total = sum(updated);
        log.info("mart_outpatient_count_monthly upserted rows={}", total);
        return total;
    }

    private static SqlParameterSource toParams(OutpatientCountMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("outpatientCount", m.getOutpatientCount(), Types.INTEGER)
                .addValue("total", m.getTotal(), Types.INTEGER);
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
