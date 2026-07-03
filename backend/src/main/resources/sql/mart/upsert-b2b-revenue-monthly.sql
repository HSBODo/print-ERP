INSERT INTO mart_b2b_revenue_monthly (
    yr, mo,
    total_revenue, case_count, avg_revenue_per_case,
    vision_revenue, cataract_revenue, vision_count, cataract_count,
    designated_revenue, non_designated_revenue, designated_count, non_designated_count,
    op_cost, exam_cost, dna_cost, prp_cost, etc_cost, presbyopia_cost, hospital_supply_cost,
    loaded_at
) VALUES (
    :yr, :mo,
    :totalRevenue, :caseCount, :avgRevenuePerCase,
    :visionRevenue, :cataractRevenue, :visionCount, :cataractCount,
    :designatedRevenue, :nonDesignatedRevenue, :designatedCount, :nonDesignatedCount,
    :opCost, :examCost, :dnaCost, :prpCost, :etcCost, :presbyopiaCost, :hospitalSupplyCost,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    total_revenue           = EXCLUDED.total_revenue,
    case_count              = EXCLUDED.case_count,
    avg_revenue_per_case    = EXCLUDED.avg_revenue_per_case,
    vision_revenue          = EXCLUDED.vision_revenue,
    cataract_revenue        = EXCLUDED.cataract_revenue,
    vision_count            = EXCLUDED.vision_count,
    cataract_count          = EXCLUDED.cataract_count,
    designated_revenue      = EXCLUDED.designated_revenue,
    non_designated_revenue  = EXCLUDED.non_designated_revenue,
    designated_count        = EXCLUDED.designated_count,
    non_designated_count    = EXCLUDED.non_designated_count,
    op_cost                 = EXCLUDED.op_cost,
    exam_cost               = EXCLUDED.exam_cost,
    dna_cost                = EXCLUDED.dna_cost,
    prp_cost                = EXCLUDED.prp_cost,
    etc_cost                = EXCLUDED.etc_cost,
    presbyopia_cost         = EXCLUDED.presbyopia_cost,
    hospital_supply_cost    = EXCLUDED.hospital_supply_cost,
    loaded_at               = CURRENT_TIMESTAMP
