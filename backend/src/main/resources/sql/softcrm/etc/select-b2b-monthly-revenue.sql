                WITH b2b_rows AS (
                __B2B_ROWS__
                )
                SELECT
                    YEAR(x.operation_date) AS yr,
                    MONTH(x.operation_date) AS mo,
                    COUNT(*) AS caseCount,
                    SUM(__REV__) AS totalRevenue,
                    CASE
                        WHEN COUNT(*) = 0 THEN 0
                        ELSE CAST(SUM(__REV__) / COUNT(*) AS INT)
                    END AS avgRevenuePerCase,
                    SUM(CASE WHEN x.surgery_category = N'시력교정' THEN __REV__ ELSE 0 END) AS visionRevenue,
                    SUM(CASE WHEN x.surgery_category = N'백내장' THEN __REV__ ELSE 0 END) AS cataractRevenue,
                    SUM(CASE WHEN x.surgery_category = N'시력교정' THEN 1 ELSE 0 END) AS visionCount,
                    SUM(CASE WHEN x.surgery_category = N'백내장' THEN 1 ELSE 0 END) AS cataractCount,
                    SUM(CASE WHEN x.designation = N'지정' THEN __REV__ ELSE 0 END) AS designatedRevenue,
                    SUM(CASE WHEN x.designation = N'비지정' THEN __REV__ ELSE 0 END) AS nonDesignatedRevenue,
                    SUM(CASE WHEN x.designation = N'지정' THEN 1 ELSE 0 END) AS designatedCount,
                    SUM(CASE WHEN x.designation = N'비지정' THEN 1 ELSE 0 END) AS nonDesignatedCount,
                    SUM(x.op_cost) AS opCost,
                    SUM(x.exam_cost) AS examCost,
                    SUM(x.dna_cost) AS dnaCost,
                    SUM(x.prp_cost) AS prpCost,
                    SUM(x.etc_cost) AS etcCost,
                    SUM(x.presbyopia_cost) AS presbyopiaCost,
                    SUM(x.hospital_supply_cost) AS hospitalSupplyCost
                FROM b2b_rows x
                GROUP BY YEAR(x.operation_date), MONTH(x.operation_date)
                ORDER BY YEAR(x.operation_date), MONTH(x.operation_date)
