package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 기타 도메인 마트 write 컴포넌트 — PR-14.
 *
 * 현재는 B2B 매출만. 후속에 dreamlens-revenue·staff-point 등이 붙으면 여기 확장.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class EtcMartWriter {

    private static final String UPSERT_B2B_REVENUE_SQL = SqlLoader.load("sql/mart/etc/upsert-b2b-revenue-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertB2bRevenueMonthly(List<B2bRevenueMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(EtcMartWriter::toParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_B2B_REVENUE_SQL, batch);
        int total = sum(updated);
        log.info("mart_b2b_revenue_monthly upserted rows={}", total);
        return total;
    }

    private static SqlParameterSource toParams(B2bRevenueMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("totalRevenue", m.getTotalRevenue())
                .addValue("caseCount", m.getCaseCount())
                .addValue("avgRevenuePerCase", m.getAvgRevenuePerCase())
                .addValue("visionRevenue", m.getVisionRevenue())
                .addValue("cataractRevenue", m.getCataractRevenue())
                .addValue("visionCount", m.getVisionCount())
                .addValue("cataractCount", m.getCataractCount())
                .addValue("designatedRevenue", m.getDesignatedRevenue())
                .addValue("nonDesignatedRevenue", m.getNonDesignatedRevenue())
                .addValue("designatedCount", m.getDesignatedCount())
                .addValue("nonDesignatedCount", m.getNonDesignatedCount())
                .addValue("opCost", m.getOpCost())
                .addValue("examCost", m.getExamCost())
                .addValue("dnaCost", m.getDnaCost())
                .addValue("prpCost", m.getPrpCost())
                .addValue("etcCost", m.getEtcCost())
                .addValue("presbyopiaCost", m.getPresbyopiaCost())
                .addValue("hospitalSupplyCost", m.getHospitalSupplyCost());
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
