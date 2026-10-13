                SELECT
                    '시력교정' AS surgery_category,
                    zz.operation_date AS operation_date,
                    MAX(zz.designation) AS designation,
                    MAX(zz.opCost) AS op_cost,
                    MAX(zz.examCost) AS exam_cost,
                    MAX(zz.dnaCost) AS dna_cost,
                    MAX(zz.prpCost) AS prp_cost,
                    MAX(zz.etcCost) AS etc_cost,
                    MAX(zz.presbyopiaCost) AS presbyopia_cost,
                    MAX(zz.hospitalSupplyCost) AS hospital_supply_cost
                FROM (
                    SELECT
                        op.operation_date,
                        CASE
                            WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                            WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                            ELSE mo.motive01
                        END AS motive01,
                        CASE WHEN c.level = 'G' THEN '비지정' ELSE '지정' END AS designation,
                __COST_SELECT__,
                        c.cust_num,
                        mo.recommender01
                    FROM raw.raw_crm_operationdata op
                    LEFT JOIN raw.raw_crm_cataract_operationdata co ON op.cust_num = co.cust_num
                    JOIN raw.raw_crm_custom c ON c.cust_num = op.cust_num
                    LEFT JOIN (
                __MOTIVE_SUBQUERY__
                    -- ⚠️ TRIM 양쪽: motive subquery(23) vs operationdata(13).
                    -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #15
                    ) mo ON TRIM(mo.cust_num) = TRIM(op.cust_num)
                    WHERE op.operation_date >= :from AND op.operation_date <= :to
                      AND co.cust_num IS NULL
                ) zz
                WHERE zz.motive01 LIKE '%B2B(기업)%'
                   OR zz.recommender01 LIKE '%이상광%'
                   OR zz.recommender01 LIKE '%유연환%'
                   OR zz.recommender01 LIKE '%이재형%'
                GROUP BY zz.cust_num, zz.operation_date
