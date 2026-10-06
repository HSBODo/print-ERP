                -- 월별 시력교정 수술 유형별 집계 · Postgres · 웨어하우스 라우팅.
                -- MSSQL 정본: sql/softcrm/surgery/select-vision-monthly-by-type.sql — PIOL 대표유형 규칙 등 그쪽 헤더 참고.
                -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
                -- SurgeryReconcileService 전용(파이프라인 밖). operation_date varchar(YYYY-MM-DD).
                SELECT
                    CAST(SUBSTRING(e.op_date FROM 1 FOR 4) AS INT) AS yr,
                    CAST(SUBSTRING(e.op_date FROM 6 FOR 2) AS INT) AS mo,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'lasek'    THEN e.cust_num END) AS lasek,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'lasik'    THEN e.cust_num END) AS lasik,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'smile'    THEN e.cust_num END) AS smile,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'smilePro' THEN e.cust_num END) AS "smilePro",
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'icl'  THEN e.cust_num END) AS icl,
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'tIcl' THEN e.cust_num END) AS "tIcl",
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'kpl'  THEN e.cust_num END) AS kpl,
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'tKpl' THEN e.cust_num END) AS "tKpl",
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'viva' THEN e.cust_num END) AS viva,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'presbyond' THEN e.cust_num END) AS presbyond,
                    COUNT(DISTINCT CASE WHEN e.op_type IN ('icl','tIcl','kpl','tKpl','viva')
                                        THEN e.cust_num END) AS "piolPatients",
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%+X%'  THEN e.cust_num END) AS xtra,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%W.V%' THEN e.cust_num END) AS "waveVision",
                    COUNT(DISTINCT CASE WHEN e.raw LIKE 'MONO%' THEN e.cust_num END) AS "monoVision",
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%CONT%' THEN e.cust_num END) AS contra,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%P.E%'  THEN e.cust_num END) AS personal,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%EYECLE%' AND e.raw LIKE '%EX500%' THEN e.cust_num END) AS "lasekEx",
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%EYECLE%' AND e.raw LIKE '%RED%'   THEN e.cust_num END) AS "lasekRed",
                    COUNT(DISTINCT e.cust_num) AS "visionPatients"
                FROM (
                    SELECT s.op_date, s.cust_num, s.raw, s.op_type,
                           ROW_NUMBER() OVER (
                               PARTITION BY SUBSTRING(s.op_date FROM 1 FOR 4), SUBSTRING(s.op_date FROM 6 FOR 2), s.cust_num,
                                            CASE WHEN s.op_type IN ('icl','tIcl','kpl','tKpl','viva') THEN 1 ELSE 0 END
                               ORDER BY s.eye_rank
                           ) AS piolRn
                    FROM (
                    SELECT o.operation_date AS op_date,
                           o.cust_num AS cust_num,
                           o.operationr AS raw,
                           1 AS eye_rank,
                CASE
                    WHEN o.operationr LIKE '%PRESBYOND%' THEN 'presbyond'
                    WHEN o.operationr LIKE '%SMILE Pro%' OR o.operationr LIKE '%SMILEpro%'
                         OR o.operationr LIKE '%SMILE PRO%' THEN 'smilePro'
                    WHEN o.operationr LIKE '%SMILE%' THEN 'smile'
                    WHEN o.operationr LIKE '%VIVA%' THEN 'viva'
                    WHEN o.operationr LIKE '%T-ICL%' OR o.operationr LIKE '%T-IPCL%'
                         OR o.operationr LIKE '%T-GLAZE%' OR o.operationr LIKE '%T-ECHO%' THEN 'tIcl'
                    WHEN o.operationr LIKE '%ICL%' OR o.operationr LIKE '%IPCL%'
                         OR o.operationr LIKE '%ARF%' OR o.operationr LIKE '%ART%'
                         OR o.operationr LIKE '%ARTIFLEX%' OR o.operationr LIKE '%GLAZE%'
                         OR o.operationr LIKE '%ECHO%' THEN 'icl'
                    WHEN o.operationr LIKE '%T-KPL%' THEN 'tKpl'
                    WHEN o.operationr LIKE '%KPL%' THEN 'kpl'
                    WHEN o.operationr LIKE '%FLAP LIFT%' OR o.operationr LIKE '%OPTI%'
                         OR o.operationr LIKE '%iFS%' OR o.operationr LIKE '%VISU%'
                         OR o.operationr LIKE '%fs200%' OR o.operationr LIKE '%Fs200%'
                         OR o.operationr LIKE '%Micro+%' OR o.operationr LIKE '%Hybrid%' THEN 'lasik'
                    WHEN o.operationr LIKE '%EYECLE%' OR o.operationr LIKE '%T-prk%'
                         OR o.operationr LIKE '%EYE CLE%' OR o.operationr LIKE '%EYE+%'
                         OR o.operationr LIKE '%FLAP PRK%' OR o.operationr LIKE '%PtK%'
                         OR o.operationr LIKE '%M-LE%' THEN 'lasek'
                    ELSE 'other'
                END
                         AS op_type
                    FROM raw.raw_crm_operationdata o
                    LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = o.cust_num
                    WHERE o.operation_date >= :from AND o.operation_date <= :to
                      AND o.operationr IS NOT NULL AND RTRIM(o.operationr) <> ''
                      AND o.operationr NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM raw.raw_crm_cataract_operationdata co
                          WHERE co.cust_num = o.cust_num
                      )
                      AND NOT (
                          COALESCE(cu.cust_name, '') LIKE '%테스트%'
                          OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                      )
                    UNION ALL
                    SELECT o.operation_date AS op_date,
                           o.cust_num AS cust_num,
                           o.operationl AS raw,
                           2 AS eye_rank,
                CASE
                    WHEN o.operationl LIKE '%PRESBYOND%' THEN 'presbyond'
                    WHEN o.operationl LIKE '%SMILE Pro%' OR o.operationl LIKE '%SMILEpro%'
                         OR o.operationl LIKE '%SMILE PRO%' THEN 'smilePro'
                    WHEN o.operationl LIKE '%SMILE%' THEN 'smile'
                    WHEN o.operationl LIKE '%VIVA%' THEN 'viva'
                    WHEN o.operationl LIKE '%T-ICL%' OR o.operationl LIKE '%T-IPCL%'
                         OR o.operationl LIKE '%T-GLAZE%' OR o.operationl LIKE '%T-ECHO%' THEN 'tIcl'
                    WHEN o.operationl LIKE '%ICL%' OR o.operationl LIKE '%IPCL%'
                         OR o.operationl LIKE '%ARF%' OR o.operationl LIKE '%ART%'
                         OR o.operationl LIKE '%ARTIFLEX%' OR o.operationl LIKE '%GLAZE%'
                         OR o.operationl LIKE '%ECHO%' THEN 'icl'
                    WHEN o.operationl LIKE '%T-KPL%' THEN 'tKpl'
                    WHEN o.operationl LIKE '%KPL%' THEN 'kpl'
                    WHEN o.operationl LIKE '%FLAP LIFT%' OR o.operationl LIKE '%OPTI%'
                         OR o.operationl LIKE '%iFS%' OR o.operationl LIKE '%VISU%'
                         OR o.operationl LIKE '%fs200%' OR o.operationl LIKE '%Fs200%'
                         OR o.operationl LIKE '%Micro+%' OR o.operationl LIKE '%Hybrid%' THEN 'lasik'
                    WHEN o.operationl LIKE '%EYECLE%' OR o.operationl LIKE '%T-prk%'
                         OR o.operationl LIKE '%EYE CLE%' OR o.operationl LIKE '%EYE+%'
                         OR o.operationl LIKE '%FLAP PRK%' OR o.operationl LIKE '%PtK%'
                         OR o.operationl LIKE '%M-LE%' THEN 'lasek'
                    ELSE 'other'
                END
                         AS op_type
                    FROM raw.raw_crm_operationdata o
                    LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = o.cust_num
                    WHERE o.operation_date >= :from AND o.operation_date <= :to
                      AND o.operationl IS NOT NULL AND RTRIM(o.operationl) <> ''
                      AND o.operationl NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM raw.raw_crm_cataract_operationdata co
                          WHERE co.cust_num = o.cust_num
                      )
                      AND NOT (
                          COALESCE(cu.cust_name, '') LIKE '%테스트%'
                          OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                      )
                    ) s
                ) e
                GROUP BY SUBSTRING(e.op_date FROM 1 FOR 4), SUBSTRING(e.op_date FROM 6 FOR 2)
                ORDER BY SUBSTRING(e.op_date FROM 1 FOR 4), SUBSTRING(e.op_date FROM 6 FOR 2)
