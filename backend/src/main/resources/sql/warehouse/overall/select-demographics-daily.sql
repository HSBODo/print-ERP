            -- 총검사자·직업구분·소개구분 일별 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/overall/select-demographics-daily.sql — 모집단·정합 근거 그쪽 참고.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            -- __EXAM_SESSION_SOURCE__ 는 SqlFragments.examSessionSource(true) 로 치환.
            SELECT p.d AS d,
                   COUNT(*) AS "popTotal",
                   SUM(p."isCat") AS "cataractSessions",
                   SUM(CASE WHEN p."jobBucket" = '직장인' THEN 1 ELSE 0 END) AS "jobOffice",
                   SUM(CASE WHEN p."jobBucket" = '학생'   THEN 1 ELSE 0 END) AS "jobStudent",
                   SUM(CASE WHEN p."jobBucket" = '기타'   THEN 1 ELSE 0 END) AS "jobEtc",
                   SUM(CASE WHEN p.motiveL IN ('소개고객', '소개미확인') THEN 1 ELSE 0 END) AS "introCustomer",
                   SUM(CASE WHEN p.motiveL = '소개직원' THEN 1 ELSE 0 END) AS "introStaff",
                   SUM(CASE WHEN p.motiveL NOT IN ('소개고객', '소개미확인', '소개직원') OR p.motiveL IS NULL THEN 1 ELSE 0 END) AS "introGeneral"
            FROM (
                SELECT src.d AS d, src."isCat" AS "isCat",
                       (CASE
                          WHEN jj.j LIKE '%교사%' OR jj.j LIKE '%교수%' OR jj.j LIKE '%교직원%' OR jj.j LIKE '%강사%' THEN '직장인'
                          WHEN jj.j LIKE '%학생%' OR jj.j LIKE '%대학원생%' OR jj.j LIKE '%수험생%'
                            OR jj.j LIKE '%재수생%' OR jj.j LIKE '%신입생%'
                            OR jj.j LIKE '초[0-9]%' OR jj.j LIKE '중[0-9]%' OR jj.j LIKE '고[0-9]%'
                            OR jj.j LIKE '%초등%' OR jj.j LIKE '%중학%' OR jj.j LIKE '%고등%' OR jj.j LIKE '%고3%'
                            OR jj.j LIKE '%대학%예정%' OR jj.j LIKE '%졸업%예정%' OR jj.j LIKE '%졸업생%' OR jj.j LIKE '%대입%'
                            OR jj.j = 'university' THEN '학생'
                          WHEN jj.j LIKE '%군인%' OR jj.j LIKE '%사회복무%' OR jj.j LIKE '%공익근무%' THEN '기타'
                          WHEN jj.j = '사무직' THEN '직장인'
                          WHEN jj.j IN ('', '.', '무', '無', '무 직', '무직', '없음', 'N', 'None', 'none', '가사', '주부',
                                        '휴식', '휴식중', '휴직중', '취업준비', '취업준비중', '취업준비(휴식)', '취업준비/휴식중',
                                        '군입대 직전', '입대 전', '기타')
                            OR jj.j LIKE '%주부%' OR jj.j LIKE '%취업준비%' OR jj.j LIKE '%취준%'
                            OR jj.j LIKE '%퇴직%' OR jj.j LIKE '%은퇴%' OR jj.j LIKE '%휴직%' THEN '기타'
                          ELSE '직장인'
                        END) AS "jobBucket",
                       m.motiveL AS motiveL
                FROM (
__EXAM_SESSION_SOURCE__
                ) src
                LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = src.cn
                CROSS JOIN LATERAL (SELECT TRIM(COALESCE(cu.job, '')) AS j) jj
                LEFT JOIN LATERAL (
                    SELECT COALESCE(m2.category01_name, '') AS motiveL
                    FROM raw.raw_crm_motive_new02 m2
                    -- ⚠️ TRIM 양쪽: motive_new02(23) vs fragment src.cn(exam/custom 13).
                    -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #5
                    WHERE TRIM(m2.cust_num) = TRIM(src.cn) AND m2.idx = '1'
                    ORDER BY m2.pkey DESC
                    LIMIT 1
                ) m ON true
            ) p
            GROUP BY p.d
            ORDER BY p.d
