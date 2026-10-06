                -- 월별 백내장 수술 눈(안) 수 · Postgres · 웨어하우스 라우팅.
                -- MSSQL 정본: sql/softcrm/surgery/select-cataract-monthly-by-type.sql — IOL 분류 근거는 그쪽 헤더 참고.
                -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
                SELECT
                    CAST(SUBSTRING(e.op_date FROM 1 FOR 4) AS INT) AS yr,
                    CAST(SUBSTRING(e.op_date FROM 6 FOR 2) AS INT) AS mo,
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catMulti' THEN e.eye_key END) AS "catMulti",
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catMono'  THEN e.eye_key END) AS "catMono",
                    COUNT(DISTINCT CASE WHEN e.cat_type = 'catEdof'  THEN e.eye_key END) AS "catEdof",
                    COUNT(DISTINCT e.eye_key) AS "cataractPatients"
                FROM (
                    SELECT c.operationr_date AS op_date,
                           c.cust_num AS cust_num,
                           TRIM(COALESCE(c.cust_num, '')) || '|' || c.operationr_date || '|R' AS eye_key,
                CASE
                    WHEN c.operationr LIKE '%EDOF%' OR c.operationr LIKE '%Vivity%'
                         OR c.operationr LIKE '%Eyhance%' OR c.operationr LIKE '%PureSee%'
                         OR c.operationr LIKE '%Isopure%' OR c.operationr LIKE '%Symfony%' THEN 'catEdof'
                    WHEN c.operationr LIKE '%K-flex%' OR c.operationr LIKE '%Kflex%' THEN 'catMono'
                    WHEN c.operationr LIKE '%Clareon%' OR c.operationr LIKE '%Panoptix%'
                         OR c.operationr LIKE '%RESTOR%' OR c.operationr LIKE '%Lara%'
                         OR c.operationr LIKE '%LISA%' OR c.operationr LIKE '%CTR(M)%'
                         OR c.operationr LIKE '%CTRmulti%' OR c.operationr LIKE '%CTR(multi)%'
                         OR c.operationr LIKE '%3PodF%' OR c.operationr LIKE '%T-CTR%'
                         OR c.operationr LIKE '%T-CATARACT%' OR c.operationr LIKE '%Precizon%'
                         OR c.operationr LIKE '%LAL%' OR c.operationr LIKE '%ELANA%'
                         OR c.operationr LIKE '%Gemetric%' THEN 'catMulti'
                    ELSE 'catMono'
                END
                         AS cat_type
                    FROM raw.raw_crm_cataract_operationdata c
                    LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = c.cust_num
                    WHERE c.operationr_date >= :from AND c.operationr_date <= :to
                      AND c.operationr IS NOT NULL AND RTRIM(c.operationr) <> ''
                      AND c.operationr NOT IN ('X','OP불가','TEST-TEST')
                      AND NOT (
                          COALESCE(cu.cust_name, '') LIKE '%테스트%'
                          OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                      )
                    UNION ALL
                    SELECT c.operationl_date AS op_date,
                           c.cust_num AS cust_num,
                           TRIM(COALESCE(c.cust_num, '')) || '|' || c.operationl_date || '|L' AS eye_key,
                CASE
                    WHEN c.operationl LIKE '%EDOF%' OR c.operationl LIKE '%Vivity%'
                         OR c.operationl LIKE '%Eyhance%' OR c.operationl LIKE '%PureSee%'
                         OR c.operationl LIKE '%Isopure%' OR c.operationl LIKE '%Symfony%' THEN 'catEdof'
                    WHEN c.operationl LIKE '%K-flex%' OR c.operationl LIKE '%Kflex%' THEN 'catMono'
                    WHEN c.operationl LIKE '%Clareon%' OR c.operationl LIKE '%Panoptix%'
                         OR c.operationl LIKE '%RESTOR%' OR c.operationl LIKE '%Lara%'
                         OR c.operationl LIKE '%LISA%' OR c.operationl LIKE '%CTR(M)%'
                         OR c.operationl LIKE '%CTRmulti%' OR c.operationl LIKE '%CTR(multi)%'
                         OR c.operationl LIKE '%3PodF%' OR c.operationl LIKE '%T-CTR%'
                         OR c.operationl LIKE '%T-CATARACT%' OR c.operationl LIKE '%Precizon%'
                         OR c.operationl LIKE '%LAL%' OR c.operationl LIKE '%ELANA%'
                         OR c.operationl LIKE '%Gemetric%' THEN 'catMulti'
                    ELSE 'catMono'
                END
                         AS cat_type
                    FROM raw.raw_crm_cataract_operationdata c
                    LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = c.cust_num
                    WHERE c.operationl_date >= :from AND c.operationl_date <= :to
                      AND c.operationl IS NOT NULL AND RTRIM(c.operationl) <> ''
                      AND c.operationl NOT IN ('X','OP불가','TEST-TEST')
                      AND NOT (
                          COALESCE(cu.cust_name, '') LIKE '%테스트%'
                          OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                      )
                ) e
                GROUP BY SUBSTRING(e.op_date FROM 1 FOR 4), SUBSTRING(e.op_date FROM 6 FOR 2)
                ORDER BY SUBSTRING(e.op_date FROM 1 FOR 4), SUBSTRING(e.op_date FROM 6 FOR 2)
