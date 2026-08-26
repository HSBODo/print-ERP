package com.bviit.analytics.etc.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.etc.dto.B2bRevenueMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * B2B 매출 마트 read 전용 리포지토리.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class B2bRevenueStatsMartRepository {

    private static final String SELECT_MONTHLY_SQL = SqlLoader.load("sql/mart/etc/select-b2b-revenue-monthly.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<B2bRevenueMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> B2bRevenueMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .totalRevenue(rs.getInt("totalRevenue"))
                        .caseCount(rs.getInt("caseCount"))
                        .avgRevenuePerCase(rs.getInt("avgRevenuePerCase"))
                        .visionRevenue(rs.getInt("visionRevenue"))
                        .cataractRevenue(rs.getInt("cataractRevenue"))
                        .visionCount(rs.getInt("visionCount"))
                        .cataractCount(rs.getInt("cataractCount"))
                        .designatedRevenue(rs.getInt("designatedRevenue"))
                        .nonDesignatedRevenue(rs.getInt("nonDesignatedRevenue"))
                        .designatedCount(rs.getInt("designatedCount"))
                        .nonDesignatedCount(rs.getInt("nonDesignatedCount"))
                        .opCost(rs.getInt("opCost"))
                        .examCost(rs.getInt("examCost"))
                        .dnaCost(rs.getInt("dnaCost"))
                        .prpCost(rs.getInt("prpCost"))
                        .etcCost(rs.getInt("etcCost"))
                        .presbyopiaCost(rs.getInt("presbyopiaCost"))
                        .hospitalSupplyCost(rs.getInt("hospitalSupplyCost"))
                        .build()
        );
    }
}
