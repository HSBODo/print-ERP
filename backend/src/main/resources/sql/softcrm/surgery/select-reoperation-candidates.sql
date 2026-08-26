            -- 재수술 후보 목록 (RE_OPERATION 원본 행 + 자동판정·제외사유 + 고객/집도의 정보)
            -- SurgeryStatsService 가 재수술 카운트의 원천으로 쓴다 — 자동판정 + 저장 판정 오버레이 후
            -- laser/lens 는 자바(ReoperationOverlay)에서 시술명 패턴으로 분류.
            -- autoIncluded=1 : 자동 집계에 포함되는 행 (저장 판정 없으면 그대로 재수술로 카운트)
            -- autoIncluded=0 : 제외된 행 + excludeReason(제외 카테고리 — RE_OPERATION 의 실제 사유값 기반)
            -- surgeon : 재수술 집도의(RE_OPERATION.AGAIN_DOCTOR → EMPLOYEE.EMP_NAME). 스칼라 서브쿼리라 행 배수 없음.
            -- 근거: docs/점검/재수술-분류_2026-01~07.md (2026-07-31 적용)
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
                    RTRIM(ISNULL(r.REASON_CD, '')) AS reasonCd,
                    -- 재수술 판정(행 단위) — find-reoperation-monthly.sql 과 동일한 규칙.
                    --   01 Irrigation(세척) · 07 Lens Reposition(재위치) · 10 CATARACT(백내장) 은 재수술 아님
                    --   시술명이 Irrigation 이면 사유코드 오입력(02 ENHANCE)이라 함께 제외
                    CASE WHEN (
                        RTRIM(ISNULL(r.REASON_CD, '')) NOT IN ('01', '07', '10')
                        AND ISNULL(r.AGAIN_R, '') NOT LIKE 'Irrigation%'
                        AND ISNULL(r.AGAIN_L, '') NOT LIKE 'Irrigation%'
                        AND (RTRIM(ISNULL(r.AGAIN_R, '')) <> '' OR RTRIM(ISNULL(r.AGAIN_L, '')) <> '')
                    ) THEN 1 ELSE 0 END AS autoIncluded
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
                autoIncluded,
                -- 제외 사유 — 추측이 아니라 RE_OPERATION.REASON_CD/REOP_REASON 실제 값으로 표기.
                -- 프론트(ReoperationCandidatesModal)가 이 문자열로 그룹핑하므로 값 종류를 고정한다.
                CASE
                    WHEN autoIncluded = 1 THEN ''
                    WHEN reasonCd = '01' THEN N'세척(Irrigation)'
                    WHEN reasonCd = '07' THEN N'재위치(Lens Reposition)'
                    WHEN reasonCd = '10' THEN N'백내장(CATARACT)'
                    WHEN (againR LIKE 'Irrigation%' OR againL LIKE 'Irrigation%')
                        THEN N'세척(Irrigation) · 사유코드 오입력'
                    WHEN RTRIM(againR) = '' AND RTRIM(againL) = '' THEN N'시술명 없음'
                    ELSE N'기타'
                END AS excludeReason
            FROM base
            ORDER BY autoIncluded DESC, excludeReason, reopDate, chartNo
