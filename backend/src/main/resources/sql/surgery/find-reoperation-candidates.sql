            -- 재수술 후보 목록 (RE_OPERATION 원본 행 + 자동판정·제외사유 + 고객/집도의 정보)
            -- 월간 레포트 재수술 건수(find-reoperation-monthly.sql)와 동일한 제외 규칙을 행 단위로 노출.
            -- autoIncluded=1 : 자동 집계에 포함되는 행(= 레포트 재수술 건수에 반영)
            -- autoIncluded=0 : 제외된 행 + excludeReason(제외 카테고리)
            -- surgeon : 재수술 집도의(RE_OPERATION.AGAIN_DOCTOR → EMPLOYEE.EMP_NAME). 스칼라 서브쿼리라 행 배수 없음.
            -- 조회/미리보기 전용 — 저장·레포트 반영은 별도 override 레이어에서 담당.
            WITH base AS (
                SELECT
                    LTRIM(RTRIM(r.CUST_NUM)) AS chartNo,
                    ISNULL(cu.CUST_NAME, '') AS name,
                    ISNULL(cu.CUST_ENAME, '') AS nameEng,
                    CASE WHEN ISNULL(cu.FIRST_DAY, '') >= :from AND ISNULL(cu.FIRST_DAY, '') <= :to
                         THEN N'신환' ELSE N'구환' END AS patientType,
                    ISNULL((
                        SELECT TOP 1 e.EMP_NAME
                        FROM EMPLOYEE e WITH(NOLOCK)
                        WHERE e.EMP_NUM = r.AGAIN_DOCTOR
                    ), '') AS surgeon,
                    -- 재수술일 기준 수납금액(COSTPRICE, PayStt<>'A'). 0/무료는 '' → 표에서 '—'.
                    ISNULL(REPLACE(CONVERT(varchar(30), CONVERT(money, NULLIF((
                        SELECT SUM(ISNULL(cp.COST_PRICE, 0))
                        FROM COSTPRICE cp WITH(NOLOCK)
                        WHERE cp.CUST_NUM = r.CUST_NUM
                          AND cp.COST_DATE = r.REOP_DATE
                          AND UPPER(ISNULL(cp.PayStt, '')) <> 'A'
                    ), 0)), 1), '.00', ''), '') AS payment,
                    ISNULL(r.REOP_DATE, '') AS reopDate,
                    ISNULL(r.AGAIN_R, '') AS againR,
                    ISNULL(r.AGAIN_L, '') AS againL,
                    -- 우안 값이 "재수술로 인정되는" 값인지 (find-reoperation-monthly.sql 제외패턴과 동일)
                    CASE WHEN (
                        r.AGAIN_R IS NOT NULL AND RTRIM(r.AGAIN_R) <> ''
                        AND r.AGAIN_R NOT LIKE 'Irrigation%' AND r.AGAIN_R NOT LIKE 'repo%'
                        AND r.AGAIN_R NOT LIKE '%reposition%' AND r.AGAIN_R NOT LIKE 'Clareon%'
                        AND r.AGAIN_R NOT LIKE 'T-Clareon%' AND r.AGAIN_R NOT LIKE 'Tecnis%'
                        AND r.AGAIN_R NOT LIKE 'LAL%' AND r.AGAIN_R NOT LIKE 'ELANA%'
                    ) THEN 1 ELSE 0 END AS rOk,
                    -- 좌안 값이 "재수술로 인정되는" 값인지
                    CASE WHEN (
                        r.AGAIN_L IS NOT NULL AND RTRIM(r.AGAIN_L) <> ''
                        AND r.AGAIN_L NOT LIKE 'Irrigation%' AND r.AGAIN_L NOT LIKE 'repo%'
                        AND r.AGAIN_L NOT LIKE '%reposition%' AND r.AGAIN_L NOT LIKE 'Clareon%'
                        AND r.AGAIN_L NOT LIKE 'T-Clareon%' AND r.AGAIN_L NOT LIKE 'Tecnis%'
                        AND r.AGAIN_L NOT LIKE 'LAL%' AND r.AGAIN_L NOT LIKE 'ELANA%'
                    ) THEN 1 ELSE 0 END AS lOk
                FROM RE_OPERATION r WITH(NOLOCK)
                LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = r.CUST_NUM
                WHERE r.REOP_DATE >= :from AND r.REOP_DATE <= :to
                  AND NOT (
                      ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                      OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                  )
            )
            SELECT
                chartNo,
                name,
                nameEng,
                patientType,
                surgeon,
                payment,
                reopDate,
                againR,
                againL,
                CASE WHEN (rOk = 1 OR lOk = 1) THEN 1 ELSE 0 END AS autoIncluded,
                CASE
                    WHEN (rOk = 1 OR lOk = 1) THEN ''
                    WHEN (againR LIKE 'Irrigation%' OR againL LIKE 'Irrigation%')
                        THEN N'세척(Irrigation)'
                    WHEN (againR LIKE 'repo%' OR againR LIKE '%reposition%'
                          OR againL LIKE 'repo%' OR againL LIKE '%reposition%')
                        THEN N'재위치(repo/reposition)'
                    WHEN (againR LIKE 'Clareon%' OR againR LIKE 'T-Clareon%' OR againR LIKE 'Tecnis%'
                          OR againR LIKE 'LAL%' OR againR LIKE 'ELANA%'
                          OR againL LIKE 'Clareon%' OR againL LIKE 'T-Clareon%' OR againL LIKE 'Tecnis%'
                          OR againL LIKE 'LAL%' OR againL LIKE 'ELANA%')
                        THEN N'렌즈(Clareon/Tecnis 등)'
                    ELSE N'기타'
                END AS excludeReason
            FROM base
            ORDER BY autoIncluded DESC, excludeReason, reopDate, chartNo
