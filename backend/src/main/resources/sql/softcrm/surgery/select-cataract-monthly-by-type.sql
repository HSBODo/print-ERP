                SELECT
                    YEAR(e.op_date) AS yr,
                    MONTH(e.op_date) AS mo,
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catMulti' THEN e.eye_key END) AS catMulti,
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catMono'  THEN e.eye_key END) AS catMono,
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catEdof'  THEN e.eye_key END) AS catEdof,
                    COUNT(DISTINCT e.eye_key) AS cataractPatients
                FROM (
                    SELECT c.OPERATIONR_DATE AS op_date,
                           c.CUST_NUM AS cust_num,
                           LTRIM(RTRIM(ISNULL(c.CUST_NUM, ''))) + '|' + c.OPERATIONR_DATE + '|R' AS eye_key,
                CASE
                    WHEN c.OPERATIONR LIKE '%EDOF%' OR c.OPERATIONR LIKE '%Vivity%'
                         OR c.OPERATIONR LIKE '%Eyhance%' OR c.OPERATIONR LIKE '%PureSee%'
                         OR c.OPERATIONR LIKE '%Isopure%' OR c.OPERATIONR LIKE '%Symfony%' THEN 'catEdof'
                    WHEN c.OPERATIONR LIKE '%K-flex%' OR c.OPERATIONR LIKE '%Kflex%' THEN 'catMono'
                    WHEN c.OPERATIONR LIKE '%Clareon%' OR c.OPERATIONR LIKE '%Panoptix%'
                         OR c.OPERATIONR LIKE '%RESTOR%' OR c.OPERATIONR LIKE '%Lara%'
                         OR c.OPERATIONR LIKE '%LISA%' OR c.OPERATIONR LIKE '%CTR(M)%'
                         OR c.OPERATIONR LIKE '%CTRmulti%' OR c.OPERATIONR LIKE '%CTR(multi)%'
                         OR c.OPERATIONR LIKE '%3PodF%' OR c.OPERATIONR LIKE '%T-CTR%'
                         OR c.OPERATIONR LIKE '%T-CATARACT%' OR c.OPERATIONR LIKE '%Precizon%'
                         OR c.OPERATIONR LIKE '%LAL%' OR c.OPERATIONR LIKE '%ELANA%'
                         OR c.OPERATIONR LIKE '%Gemetric%' THEN 'catMulti'
                    ELSE 'catMono'
                END
                         AS cat_type
                    FROM Cataract_Operationdata c WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = c.CUST_NUM
                    WHERE c.OPERATIONR_DATE >= :from AND c.OPERATIONR_DATE <= :to
                      AND c.OPERATIONR IS NOT NULL AND RTRIM(c.OPERATIONR) <> ''
                      AND c.OPERATIONR NOT IN ('X','OP불가','TEST-TEST')
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                    UNION ALL
                    SELECT c.OPERATIONL_DATE AS op_date,
                           c.CUST_NUM AS cust_num,
                           LTRIM(RTRIM(ISNULL(c.CUST_NUM, ''))) + '|' + c.OPERATIONL_DATE + '|L' AS eye_key,
                CASE
                    WHEN c.OPERATIONL LIKE '%EDOF%' OR c.OPERATIONL LIKE '%Vivity%'
                         OR c.OPERATIONL LIKE '%Eyhance%' OR c.OPERATIONL LIKE '%PureSee%'
                         OR c.OPERATIONL LIKE '%Isopure%' OR c.OPERATIONL LIKE '%Symfony%' THEN 'catEdof'
                    WHEN c.OPERATIONL LIKE '%K-flex%' OR c.OPERATIONL LIKE '%Kflex%' THEN 'catMono'
                    WHEN c.OPERATIONL LIKE '%Clareon%' OR c.OPERATIONL LIKE '%Panoptix%'
                         OR c.OPERATIONL LIKE '%RESTOR%' OR c.OPERATIONL LIKE '%Lara%'
                         OR c.OPERATIONL LIKE '%LISA%' OR c.OPERATIONL LIKE '%CTR(M)%'
                         OR c.OPERATIONL LIKE '%CTRmulti%' OR c.OPERATIONL LIKE '%CTR(multi)%'
                         OR c.OPERATIONL LIKE '%3PodF%' OR c.OPERATIONL LIKE '%T-CTR%'
                         OR c.OPERATIONL LIKE '%T-CATARACT%' OR c.OPERATIONL LIKE '%Precizon%'
                         OR c.OPERATIONL LIKE '%LAL%' OR c.OPERATIONL LIKE '%ELANA%'
                         OR c.OPERATIONL LIKE '%Gemetric%' THEN 'catMulti'
                    ELSE 'catMono'
                END
                         AS cat_type
                    FROM Cataract_Operationdata c WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = c.CUST_NUM
                    WHERE c.OPERATIONL_DATE >= :from AND c.OPERATIONL_DATE <= :to
                      AND c.OPERATIONL IS NOT NULL AND RTRIM(c.OPERATIONL) <> ''
                      AND c.OPERATIONL NOT IN ('X','OP불가','TEST-TEST')
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                ) e
                GROUP BY YEAR(e.op_date), MONTH(e.op_date)
                ORDER BY YEAR(e.op_date), MONTH(e.op_date)
