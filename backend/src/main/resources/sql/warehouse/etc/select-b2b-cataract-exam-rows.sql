                SELECT
                    '백내장' AS surgery_category,
                    zz.exam_date AS operation_date,
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
                        ex.exam_date AS exam_date,
                        CASE
                            WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                            WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                            ELSE mo.motive01
                        END AS motive01,
                        CASE WHEN c.level = 'G' THEN '비지정' ELSE '지정' END AS designation,
                __COST_SELECT__,
                        c.cust_num,
                        mo.recommender01
                    FROM raw.raw_crm_cataract_exam ex
                    JOIN raw.raw_crm_custom c ON c.cust_num = ex.cust_num
                    JOIN raw.raw_crm_motive_new01 mo ON mo.cust_num = ex.cust_num
                    WHERE ex.exam_date >= :from AND ex.exam_date <= :to
                      AND (
                          mo.motive01 LIKE '%B2B(기업)%'
                          OR mo.motive02 LIKE '%B2B(기업)%'
                          OR mo.recommender01 LIKE '%이상광%'
                          OR mo.recommender01 LIKE '%유연환%'
                          OR mo.recommender01 LIKE '%이재형%'
                      )
                ) zz
                GROUP BY zz.cust_num, zz.exam_date
