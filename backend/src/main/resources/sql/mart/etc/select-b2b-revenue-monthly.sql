SELECT
    yr,
    mo,
    total_revenue           AS "totalRevenue",
    case_count              AS "caseCount",
    avg_revenue_per_case    AS "avgRevenuePerCase",
    vision_revenue          AS "visionRevenue",
    cataract_revenue        AS "cataractRevenue",
    vision_count            AS "visionCount",
    cataract_count          AS "cataractCount",
    designated_revenue      AS "designatedRevenue",
    non_designated_revenue  AS "nonDesignatedRevenue",
    designated_count        AS "designatedCount",
    non_designated_count    AS "nonDesignatedCount",
    op_cost                 AS "opCost",
    exam_cost               AS "examCost",
    dna_cost                AS "dnaCost",
    prp_cost                AS "prpCost",
    etc_cost                AS "etcCost",
    presbyopia_cost         AS "presbyopiaCost",
    hospital_supply_cost    AS "hospitalSupplyCost"
  FROM mart_b2b_revenue_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
