                -- 월간 레포트 재수술 건수.
                -- 제외 규칙은 find-reoperation-daily.sql · find-reoperation-candidates.sql 와 동일하게 유지할 것.
                -- 근거: docs/점검/재수술-분류_2026-01~07.md (2026-07-31 적용)
                SELECT
                    x.yr, x.mo,
                    COUNT(*) AS reoperation,
                    SUM(CASE WHEN x.cat = 'lens' THEN 0 ELSE 1 END) AS reopLaser,
                    SUM(CASE WHEN x.cat = 'lens' THEN 1 ELSE 0 END) AS reopLens
                FROM (
                    SELECT
                        CAST(LEFT(y.d, 4) AS int)         AS yr,
                        CAST(SUBSTRING(y.d, 6, 2) AS int) AS mo,
                        CASE WHEN (
                    y.qt LIKE '%remo%' OR y.qt LIKE '%exch%' OR y.qt LIKE '%ICL%'
                    OR y.qt LIKE '%ARF%' OR y.qt LIKE '%ART%' OR y.qt LIKE '%EVO%'
                    OR y.qt LIKE '%ECHO%' OR y.qt LIKE '%GLAZE%' OR y.qt LIKE '%precizon%'
                    OR y.qt LIKE '%Lisa%' OR y.qt LIKE '%Gemetric%' OR y.qt LIKE '%encla%'
                        ) THEN 'lens' ELSE 'laser' END AS cat
                    FROM (
                        SELECT
                            r.REOP_DATE AS d,
                            -- 렌즈/레이저 구분용 시술명(양안). 포함 여부는 아래 WHERE 의 사유코드가 판단한다.
                            ISNULL(r.AGAIN_R, '') + '|' + ISNULL(r.AGAIN_L, '') AS qt
                        FROM RE_OPERATION r WITH(NOLOCK)
                        LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = r.CUST_NUM
                        WHERE r.REOP_DATE >= :from AND r.REOP_DATE <= :to
                          AND NOT (
                              ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                              OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                          )
                          -- 재수술 아님: 01 Irrigation(세척) · 07 Lens Reposition(재위치) · 10 CATARACT(백내장)
                          AND RTRIM(ISNULL(r.REASON_CD, '')) NOT IN ('01', '07', '10')
                          -- 시술명이 Irrigation 이면 사유코드(02 ENHANCE)가 오입력된 세척 건이라 함께 제외
                          AND ISNULL(r.AGAIN_R, '') NOT LIKE 'Irrigation%'
                          AND ISNULL(r.AGAIN_L, '') NOT LIKE 'Irrigation%'
                          -- 양안 모두 시술명이 비면 집계 대상 아님
                          AND (RTRIM(ISNULL(r.AGAIN_R, '')) <> '' OR RTRIM(ISNULL(r.AGAIN_L, '')) <> '')
                    ) y
                ) x
                GROUP BY x.yr, x.mo
                ORDER BY x.yr, x.mo
