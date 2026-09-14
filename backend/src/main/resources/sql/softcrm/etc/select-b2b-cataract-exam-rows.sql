                SELECT
                    N'백내장' AS surgery_category,
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
                        ex.EXAM_DATE AS exam_date,
                        CASE
                            WHEN mo.motive01 LIKE '%B2B(기업)%' THEN mo.motive01
                            WHEN mo.motive02 LIKE '%B2B(기업)%' THEN mo.motive02
                            ELSE mo.motive01
                        END AS motive01,
                        CASE WHEN c.[Level] = 'G' THEN N'비지정' ELSE N'지정' END AS designation,
                __COST_SELECT__,
                        c.CUST_NUM,
                        mo.recommender01
                    FROM Cataract_Exam ex WITH(NOLOCK)
                    JOIN CUSTOM c WITH(NOLOCK) ON c.CUST_NUM = ex.CUST_NUM
                    JOIN MOTIVE_NEW01 mo WITH(NOLOCK) ON mo.cust_num = ex.CUST_NUM
                    WHERE ex.EXAM_DATE >= :from AND ex.EXAM_DATE <= :to
                      AND (
                          mo.motive01 LIKE '%B2B(기업)%'
                          OR mo.motive02 LIKE '%B2B(기업)%'
                          OR mo.recommender01 LIKE N'%이상광%'
                          OR mo.recommender01 LIKE N'%유연환%'
                          OR mo.recommender01 LIKE N'%이재형%'
                      )
                ) zz
                GROUP BY zz.CUST_NUM, zz.exam_date
