package com.bviit.analytics.etc.repository;

import com.bviit.analytics.common.util.SqlLoader;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * B2B 매출 월별 집계 쿼리.
 *
 * 레거시 BCRM routes/b2b-corp-settlement.js를 기준으로
 * B2B(기업) 관련 시력교정, 백내장 수술/검사 데이터를 월별로 합산한다.
 *
 * 매출 정의:
 *   수술비 + 검사비 + DNA + PRP + 기타/약 + 노안 + 병원물품
 *
 * MSSQL 2014 / JTDS 호환을 위해 최신 함수 사용 금지.
 * READ-ONLY — SELECT만 실행.
 */
@Repository
@Profile("postgres-mart")
public class B2bRevenueStatsRepository {

    private static final String MONTHLY_REVENUE_SQL = "sql/softcrm/etc/select-b2b-monthly-revenue.sql";
    private static final String VISION_SURGERY_ROWS_SQL = "sql/softcrm/etc/select-b2b-vision-surgery-rows.sql";
    private static final String CATARACT_SURGERY_ROWS_SQL = "sql/softcrm/etc/select-b2b-cataract-surgery-rows.sql";
    private static final String CATARACT_EXAM_ROWS_SQL = "sql/softcrm/etc/select-b2b-cataract-exam-rows.sql";
    private static final String MOTIVE_SUBQUERY_SQL = "sql/softcrm/etc/select-b2b-motive-subquery.sql";
    private static final String LATEST_COST_SUBQUERY_SQL = "sql/softcrm/etc/select-b2b-latest-cost-subquery.sql";
    private static final String ACCUMULATED_COST_SUBQUERY_SQL = "sql/softcrm/etc/select-b2b-accumulated-cost-subquery.sql";
    private static final String LATEST_COST_DATE_CONDITION_SQL = "sql/softcrm/etc/select-b2b-latest-cost-date-condition.sql";
    private static final String TOTAL_REVENUE_EXPRESSION =
            "(x.op_cost + x.exam_cost + x.dna_cost + x.prp_cost + x.etc_cost"
                    + " + x.presbyopia_cost + x.hospital_supply_cost)";

    private static final String[][] COST_COLUMNS = {
            {"opCost", "'O'", "false"},
            {"examCost", "'33'", "true"},
            {"dnaCost", "'D'", "true"},
            {"prpCost", "'Q','32'", "true"},
            {"etcCost", "'V'", "true"},
            {"presbyopiaCost", "'z','Y','H'", "true"},
            {"hospitalSupplyCost", "'U','3','1','K','2','7','8','9'", "true"}
    };

    private final NamedParameterJdbcTemplate jdbc;
    private final String monthlyRevenueSql;
    private final String visionSurgeryRowsSql;
    private final String cataractSurgeryRowsSql;
    private final String cataractExamRowsSql;
    private final String motiveSubquerySql;
    private final String latestCostSubquerySql;
    private final String accumulatedCostSubquerySql;
    private final String latestCostDateConditionSql;

    public B2bRevenueStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
        this.monthlyRevenueSql = SqlLoader.load(MONTHLY_REVENUE_SQL);
        this.visionSurgeryRowsSql = SqlLoader.load(VISION_SURGERY_ROWS_SQL);
        this.cataractSurgeryRowsSql = SqlLoader.load(CATARACT_SURGERY_ROWS_SQL);
        this.cataractExamRowsSql = SqlLoader.load(CATARACT_EXAM_ROWS_SQL);
        this.motiveSubquerySql = SqlLoader.load(MOTIVE_SUBQUERY_SQL);
        this.latestCostSubquerySql = SqlLoader.load(LATEST_COST_SUBQUERY_SQL);
        this.accumulatedCostSubquerySql = SqlLoader.load(ACCUMULATED_COST_SUBQUERY_SQL);
        this.latestCostDateConditionSql = SqlLoader.load(LATEST_COST_DATE_CONDITION_SQL);
    }

    public List<Map<String, Object>> findMonthlyRevenue(List<Integer> years) {
        String operationCostSelect = buildLatestCostSelect("op.CUST_NUM", "op.OPERATION_DATE");
        String examCostSelect = buildAccumulatedCostSelect("ex.CUST_NUM");
        String sql = buildMonthlyRevenueQuery(operationCostSelect, examCostSelect);

        return jdbc.queryForList(sql, createYearRangeParams(years));
    }

    private MapSqlParameterSource createYearRangeParams(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);

        return new MapSqlParameterSource()
                .addValue("from", minYear + "-01-01")
                .addValue("to", maxYear + "-12-31");
    }

    private String buildMonthlyRevenueQuery(String operationCostSelect, String examCostSelect) {
        String b2bRowsSql = String.join(
                "\n\nUNION ALL\n\n",
                buildVisionSurgeryRevenueRows(operationCostSelect),
                buildCataractSurgeryRevenueRows(operationCostSelect),
                buildCataractExamRevenueRows(examCostSelect)
        );

        return monthlyRevenueSql
                .replace("__B2B_ROWS__", b2bRowsSql)
                .replace("__REV__", TOTAL_REVENUE_EXPRESSION);
    }

    private String buildVisionSurgeryRevenueRows(String operationCostSelect) {
        return visionSurgeryRowsSql
                .replace("__MOTIVE_SUBQUERY__", buildMotiveSubquery())
                .replace("__COST_SELECT__", operationCostSelect);
    }

    private String buildCataractSurgeryRevenueRows(String operationCostSelect) {
        return cataractSurgeryRowsSql
                .replace("__MOTIVE_SUBQUERY__", buildMotiveSubquery())
                .replace("__COST_SELECT__", operationCostSelect);
    }

    private String buildCataractExamRevenueRows(String examCostSelect) {
        return cataractExamRowsSql.replace("__COST_SELECT__", examCostSelect);
    }

    private String buildMotiveSubquery() {
        return motiveSubquerySql;
    }

    private String buildLatestCostSelect(String customerExpression, String eventDateExpression) {
        return Arrays.stream(COST_COLUMNS)
                .map(costColumn -> buildLatestCostSubquery(
                        customerExpression,
                        eventDateExpression,
                        costColumn[0],
                        costColumn[1],
                        Boolean.parseBoolean(costColumn[2])
                ))
                .collect(Collectors.joining(",\n"));
    }

    private String buildAccumulatedCostSelect(String customerExpression) {
        return Arrays.stream(COST_COLUMNS)
                .map(costColumn -> buildAccumulatedCostSubquery(customerExpression, costColumn[0], costColumn[1]))
                .collect(Collectors.joining(",\n"));
    }

    /**
     * COSTPRICE 비용 서브쿼리 생성.
     * 수술비(opCost)는 레거시와 동일하게 날짜 제한 없이 최신 값을 사용한다.
     */
    private String buildLatestCostSubquery(
            String customerExpression,
            String eventDateExpression,
            String alias,
            String prcCodes,
            boolean useDateLimit
    ) {
        String dateCondition = useDateLimit
                ? latestCostDateConditionSql.replace("__EVENT_DATE_EXPRESSION__", eventDateExpression)
                : "";

        return latestCostSubquerySql
                .replace("__CUSTOMER_EXPRESSION__", customerExpression)
                .replace("__DATE_CONDITION__", dateCondition)
                .replace("__PRC_CODES__", prcCodes)
                .replace("__ALIAS__", alias);
    }

    private String buildAccumulatedCostSubquery(String customerExpression, String alias, String prcCodes) {
        return accumulatedCostSubquerySql
                .replace("__CUSTOMER_EXPRESSION__", customerExpression)
                .replace("__PRC_CODES__", prcCodes)
                .replace("__ALIAS__", alias);
    }
}
