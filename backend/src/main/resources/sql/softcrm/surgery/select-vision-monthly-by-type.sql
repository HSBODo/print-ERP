                -- 월별 시력교정 수술 유형별 집계 (수술일 기준).
                --
                -- PIOL 유형별(icl·tIcl·kpl·tKpl·viva)은 **환자당 대표유형 1건만** 센다.
                -- 대표유형 = 우안(OPERATIONR) 우선, 우안에 PIOL 이 없으면 좌안.
                -- 규칙·근거는 select-vision-daily-by-type.sql 머리 주석 참조(둘은 같은 기준이어야 한다).
                SELECT
                    YEAR(e.op_date) AS yr,
                    MONTH(e.op_date) AS mo,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'lasek'    THEN e.cust_num END) AS lasek,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'lasik'    THEN e.cust_num END) AS lasik,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'smile'    THEN e.cust_num END) AS smile,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'smilePro' THEN e.cust_num END) AS smilePro,
                    -- PIOL 유형별 — 대표유형(piolRn = 1) 한 건만
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'icl'  THEN e.cust_num END) AS icl,
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'tIcl' THEN e.cust_num END) AS tIcl,
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'kpl'  THEN e.cust_num END) AS kpl,
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'tKpl' THEN e.cust_num END) AS tKpl,
                    COUNT(DISTINCT CASE WHEN e.piolRn = 1 AND e.op_type = 'viva' THEN e.cust_num END) AS viva,
                    COUNT(DISTINCT CASE WHEN e.op_type = 'presbyond' THEN e.cust_num END) AS presbyond,
                    -- PIOL 실인원. 위 대표유형 5종의 합과 같다(같아야 한다).
                    COUNT(DISTINCT CASE WHEN e.op_type IN ('icl','tIcl','kpl','tKpl','viva')
                                        THEN e.cust_num END) AS piolPatients,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%+X%'  THEN e.cust_num END) AS xtra,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%W.V%' THEN e.cust_num END) AS waveVision,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE 'MONO%' THEN e.cust_num END) AS monoVision,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%CONT%' THEN e.cust_num END) AS contra,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%P.E%'  THEN e.cust_num END) AS personal,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%EYECLE%' AND e.raw LIKE '%EX500%' THEN e.cust_num END) AS lasekEx,
                    COUNT(DISTINCT CASE WHEN e.raw LIKE '%EYECLE%' AND e.raw LIKE '%RED%'   THEN e.cust_num END) AS lasekRed,
                    COUNT(DISTINCT e.cust_num) AS visionPatients
                FROM (
                    -- PIOL 행에 한해 (연·월·환자)별로 우안(eye_rank=1) 먼저 번호를 매긴다.
                    -- PIOL 여부로 파티션을 갈라 비-PIOL 행의 번호가 섞이지 않게 한다.
                    SELECT s.op_date, s.cust_num, s.raw, s.op_type,
                           ROW_NUMBER() OVER (
                               PARTITION BY YEAR(s.op_date), MONTH(s.op_date), s.cust_num,
                                            CASE WHEN s.op_type IN ('icl','tIcl','kpl','tKpl','viva') THEN 1 ELSE 0 END
                               ORDER BY s.eye_rank
                           ) AS piolRn
                    FROM (
                    SELECT o.OPERATION_DATE AS op_date,
                           o.CUST_NUM AS cust_num,
                           o.OPERATIONR AS raw,
                           1 AS eye_rank,
                CASE
                    -- PRESBYOND(노안 레이저)를 맨 앞에 둔다. 'Mono+PRESBYOND' 처럼 다른 표기와
                    -- 섞여 들어와도 노안 시술로 잡아야 해서다. 이전에는 분기가 없어 other 로
                    -- 떨어져 총계에만 들어가고 유형별 표에서는 보이지 않았다.
                    WHEN o.OPERATIONR LIKE '%PRESBYOND%' THEN 'presbyond'
                    WHEN o.OPERATIONR LIKE '%SMILE Pro%' OR o.OPERATIONR LIKE '%SMILEpro%'
                         OR o.OPERATIONR LIKE '%SMILE PRO%' THEN 'smilePro'
                    WHEN o.OPERATIONR LIKE '%SMILE%' THEN 'smile'
                    WHEN o.OPERATIONR LIKE '%VIVA%' THEN 'viva'
                    WHEN o.OPERATIONR LIKE '%T-ICL%' OR o.OPERATIONR LIKE '%T-IPCL%'
                         OR o.OPERATIONR LIKE '%T-GLAZE%' OR o.OPERATIONR LIKE '%T-ECHO%' THEN 'tIcl'
                    WHEN o.OPERATIONR LIKE '%ICL%' OR o.OPERATIONR LIKE '%IPCL%'
                         OR o.OPERATIONR LIKE '%ARF%' OR o.OPERATIONR LIKE '%ART%'
                         OR o.OPERATIONR LIKE '%ARTIFLEX%' OR o.OPERATIONR LIKE '%GLAZE%'
                         OR o.OPERATIONR LIKE '%ECHO%' THEN 'icl'
                    WHEN o.OPERATIONR LIKE '%T-KPL%' THEN 'tKpl'
                    WHEN o.OPERATIONR LIKE '%KPL%' THEN 'kpl'
                    WHEN o.OPERATIONR LIKE '%FLAP LIFT%' OR o.OPERATIONR LIKE '%OPTI%'
                         OR o.OPERATIONR LIKE '%iFS%' OR o.OPERATIONR LIKE '%VISU%'
                         OR o.OPERATIONR LIKE '%fs200%' OR o.OPERATIONR LIKE '%Fs200%'
                         OR o.OPERATIONR LIKE '%Micro+%' OR o.OPERATIONR LIKE '%Hybrid%' THEN 'lasik'
                    WHEN o.OPERATIONR LIKE '%EYECLE%' OR o.OPERATIONR LIKE '%T-prk%'
                         OR o.OPERATIONR LIKE '%EYE CLE%' OR o.OPERATIONR LIKE '%EYE+%'
                         OR o.OPERATIONR LIKE '%FLAP PRK%' OR o.OPERATIONR LIKE '%PtK%'
                         OR o.OPERATIONR LIKE '%M-LE%' THEN 'lasek'
                    ELSE 'other'
                END
                         AS op_type
                    FROM OPERATIONDATA o WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = o.CUST_NUM
                    WHERE o.OPERATION_DATE >= :from AND o.OPERATION_DATE <= :to
                      AND o.OPERATIONR IS NOT NULL AND RTRIM(o.OPERATIONR) <> ''
                      AND o.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM Cataract_Operationdata co WITH(NOLOCK)
                          WHERE co.CUST_NUM = o.CUST_NUM
                      )
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                    UNION ALL
                    SELECT o.OPERATION_DATE AS op_date,
                           o.CUST_NUM AS cust_num,
                           o.OPERATIONL AS raw,
                           2 AS eye_rank,
                CASE
                    -- 우안 CASE 와 동일 규칙 (§PRESBYOND 주석 참조)
                    WHEN o.OPERATIONL LIKE '%PRESBYOND%' THEN 'presbyond'
                    WHEN o.OPERATIONL LIKE '%SMILE Pro%' OR o.OPERATIONL LIKE '%SMILEpro%'
                         OR o.OPERATIONL LIKE '%SMILE PRO%' THEN 'smilePro'
                    WHEN o.OPERATIONL LIKE '%SMILE%' THEN 'smile'
                    WHEN o.OPERATIONL LIKE '%VIVA%' THEN 'viva'
                    WHEN o.OPERATIONL LIKE '%T-ICL%' OR o.OPERATIONL LIKE '%T-IPCL%'
                         OR o.OPERATIONL LIKE '%T-GLAZE%' OR o.OPERATIONL LIKE '%T-ECHO%' THEN 'tIcl'
                    WHEN o.OPERATIONL LIKE '%ICL%' OR o.OPERATIONL LIKE '%IPCL%'
                         OR o.OPERATIONL LIKE '%ARF%' OR o.OPERATIONL LIKE '%ART%'
                         OR o.OPERATIONL LIKE '%ARTIFLEX%' OR o.OPERATIONL LIKE '%GLAZE%'
                         OR o.OPERATIONL LIKE '%ECHO%' THEN 'icl'
                    WHEN o.OPERATIONL LIKE '%T-KPL%' THEN 'tKpl'
                    WHEN o.OPERATIONL LIKE '%KPL%' THEN 'kpl'
                    WHEN o.OPERATIONL LIKE '%FLAP LIFT%' OR o.OPERATIONL LIKE '%OPTI%'
                         OR o.OPERATIONL LIKE '%iFS%' OR o.OPERATIONL LIKE '%VISU%'
                         OR o.OPERATIONL LIKE '%fs200%' OR o.OPERATIONL LIKE '%Fs200%'
                         OR o.OPERATIONL LIKE '%Micro+%' OR o.OPERATIONL LIKE '%Hybrid%' THEN 'lasik'
                    WHEN o.OPERATIONL LIKE '%EYECLE%' OR o.OPERATIONL LIKE '%T-prk%'
                         OR o.OPERATIONL LIKE '%EYE CLE%' OR o.OPERATIONL LIKE '%EYE+%'
                         OR o.OPERATIONL LIKE '%FLAP PRK%' OR o.OPERATIONL LIKE '%PtK%'
                         OR o.OPERATIONL LIKE '%M-LE%' THEN 'lasek'
                    ELSE 'other'
                END
                         AS op_type
                    FROM OPERATIONDATA o WITH(NOLOCK)
                    LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = o.CUST_NUM
                    WHERE o.OPERATION_DATE >= :from AND o.OPERATION_DATE <= :to
                      AND o.OPERATIONL IS NOT NULL AND RTRIM(o.OPERATIONL) <> ''
                      AND o.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM Cataract_Operationdata co WITH(NOLOCK)
                          WHERE co.CUST_NUM = o.CUST_NUM
                      )
                      AND NOT (
                          ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                          OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                      )
                    ) s
                ) e
                GROUP BY YEAR(e.op_date), MONTH(e.op_date)
                ORDER BY YEAR(e.op_date), MONTH(e.op_date)
