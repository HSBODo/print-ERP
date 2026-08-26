                SELECT
                    N'시력교정' AS surgery_category,
                    zz.OPERATION_DATE AS operation_date,
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
                        op.OPERATION_DATE,
                        CASE
                            WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                            WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                            ELSE mo.motive01
                        END AS motive01,
                        CASE WHEN c.[Level] = 'G' THEN N'비지정' ELSE N'지정' END AS designation,
                __COST_SELECT__,
                        c.CUST_NUM,
                        mo.recommender01
                    FROM OPERATIONDATA op WITH(NOLOCK)
                    LEFT JOIN Cataract_Operationdata co WITH(NOLOCK) ON op.CUST_NUM = co.CUST_NUM
                    JOIN CUSTOM c WITH(NOLOCK) ON c.CUST_NUM = op.CUST_NUM
                    LEFT JOIN (
                __MOTIVE_SUBQUERY__
                    ) mo ON mo.cust_num = op.CUST_NUM
                    WHERE op.OPERATION_DATE >= :from AND op.OPERATION_DATE <= :to
                      AND co.CUST_NUM IS NULL
                ) zz
                WHERE zz.motive01 LIKE '%B2B(기업)%'
                   OR zz.recommender01 LIKE N'%이상광%'
                   OR zz.recommender01 LIKE N'%유연환%'
                   OR zz.recommender01 LIKE N'%이재형%'
                GROUP BY zz.CUST_NUM, zz.OPERATION_DATE
