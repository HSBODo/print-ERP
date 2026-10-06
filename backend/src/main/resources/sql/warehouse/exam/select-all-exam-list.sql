            -- 전체 검사자 리스트 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/exam/select-all-exam-list.sql — 분류·필터 근거는 그쪽 헤더 참고.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            -- __EXAM_MEASUREMENTS_BLANK__ 는 SqlFragments.examMeasurementsBlankPredicate("e", true) 로 치환.
            SELECT
              COALESCE(TRIM(src.cn), '')                   AS "chartNo",
              COALESCE(cu.cust_name, '')                   AS name,
              COALESCE(src.d, '')                          AS "examDate",
              CASE WHEN src."isCat" = 1 THEN '백내장'
                   WHEN vis."hasDreamlens" = 1 AND vis."hasMedical" = 0 THEN '드림렌즈'
                   ELSE '시력교정' END                     AS "examGroup",
              CASE WHEN src."isOneDay" = 1 THEN '원데이' ELSE '일반' END AS "examType",
              COALESCE(src."catClass", '')                 AS "cataractClass",
              CASE WHEN COALESCE(cu.first_day, '') >= :from AND COALESCE(cu.first_day, '') <= :to
                   THEN '신환' ELSE '구환' END             AS "patientType",
              CASE WHEN mv.motiveL IN ('소개고객', '소개미확인') THEN '고객소개'
                   WHEN mv.motiveL = '소개직원' THEN '직원소개'
                   ELSE '일반' END                         AS "introType",
              CASE
                WHEN mv.motiveL = 'B2B(군인)' THEN 'B2B(군인)'
                WHEN mv.motiveL IN ('B2B(기업)', 'B2B(비앤빛)', 'B2B(백내장)', '제휴') THEN 'B2B(기업)'
                WHEN mv.motiveL IN ('소개고객', '소개미확인', 'VIP고객관리팀') THEN '소개고객'
                WHEN mv.motiveL IN ('소개직원', '광고', '바이럴', '프로모션', '홈페이지') THEN mv.motiveL
                ELSE '기타'
              END                                          AS "motiveReport",
              COALESCE(mv.motiveL, '')                     AS "motiveL",
              COALESCE(mv.motiveM, '')                     AS "motiveM",
              COALESCE(mv.motiveS, '')                     AS "motiveS",
              CASE
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
              END                                          AS "jobBucket",
              COALESCE(cu.job, '')                         AS job,
              COALESCE(cu.level, '')                       AS grade,
              COALESCE(cu.birth_day, '')                   AS birth,
              COALESCE(cu.call_num2, '')                   AS phone2,
              COALESCE(cu.call_num1, '')                   AS phone1,
              COALESCE(cu.email, '')                       AS email,
              COALESCE(ec.nm, '')                          AS counselor,
              COALESCE(ed.nm, '')                          AS doctor,
              COALESCE(eo.nm, '')                          AS optometrist,
              COALESCE(cu.last_day, '')                    AS "lastVisit",
              COALESCE(cu.etc, '')                         AS memo
            FROM (
              SELECT e.cust_num AS cn, e.exam_date AS d, 0 AS "isCat",
                     CASE WHEN NOT (COALESCE(e.exam_memo, '') LIKE '%테스트%' OR LOWER(COALESCE(e.exam_memo, '')) LIKE '%test%')
                           AND EXISTS (SELECT 1 FROM raw.raw_crm_reservation r
                                       WHERE r.cust_num = e.cust_num AND r.reserve_date = e.exam_date
                                         AND r.reserve_flag = 'M' AND r.reserve_jinryo IN ('5','7') AND r.reserve_state IN ('I','H'))
                          THEN 1 ELSE 0 END AS "isOneDay",
                     CAST('' AS varchar(20)) AS "catClass"
              FROM raw.raw_crm_exam e
              JOIN raw.raw_crm_custom cux ON e.cust_num = cux.cust_num
              WHERE e.exam_date >= :from AND e.exam_date <= :to
                AND NOT (COALESCE(cux.cust_name, '') LIKE '%테스트%' OR LOWER(COALESCE(cux.cust_name, '')) LIKE '%test%')
                AND NOT (
                  EXISTS (SELECT 1 FROM raw.raw_crm_cataract_exam ce
                          WHERE ce.cust_num = e.cust_num AND ce.exam_date = e.exam_date)
                  AND __EXAM_MEASUREMENTS_BLANK__
                )
              UNION ALL
              SELECT B.cust_num AS cn, D2.reserve_date AS d, 1 AS "isCat",
                     MAX(CASE WHEN COALESCE(D2.reserve_jinryo, '') IN ('7', '9') THEN 1 ELSE 0 END) AS "isOneDay",
                     CAST(CASE WHEN opt.v = 1 AND B.my_counselor = 'BS0808' THEN '중단'
                               WHEN opt.v = 1 AND cns.v = 1                 THEN '백내장'
                               WHEN B.my_counselor = 'BS0808'               THEN '노안/FU'
                               ELSE '기타' END AS varchar(20)) AS "catClass"
              FROM raw.raw_crm_custom B
              JOIN raw.raw_crm_reservation D2 ON D2.cust_num = B.cust_num
              CROSS JOIN LATERAL (SELECT CASE WHEN EXISTS (SELECT 1 FROM raw.raw_crm_employee E1
                                                    WHERE E1.emp_num = B.my_optometrist) THEN 1 ELSE 0 END AS v) opt
              CROSS JOIN LATERAL (SELECT CASE WHEN EXISTS (SELECT 1 FROM raw.raw_crm_employee E2
                                                    WHERE E2.emp_num = B.my_counselor)   THEN 1 ELSE 0 END AS v) cns
              WHERE D2.reserve_date >= :from AND D2.reserve_date <= :to
                AND D2.reserve_flag = 'H'
                AND COALESCE(D2.reserve_jinryo, '') <> '3'
                AND COALESCE(D2.reserve_seq, 0) <> 3
                AND D2.reserve_state NOT IN ('C', 'Y')
                AND B.cust_num <> '9999999999999'
                AND NOT (
                  COALESCE(B.cust_name, '') LIKE '%테스트%'
                  OR LOWER(COALESCE(B.cust_name, '')) LIKE '%test%'
                )
              GROUP BY B.cust_num, D2.reserve_date,
                       CASE WHEN opt.v = 1 AND B.my_counselor = 'BS0808' THEN '중단'
                            WHEN opt.v = 1 AND cns.v = 1                 THEN '백내장'
                            WHEN B.my_counselor = 'BS0808'               THEN '노안/FU'
                            ELSE '기타' END
            ) src
            LEFT JOIN raw.raw_crm_custom cu ON cu.cust_num = src.cn
            LEFT JOIN LATERAL (
              SELECT
                CASE WHEN EXISTS (SELECT 1 FROM raw.raw_crm_reservation rd
                                   WHERE rd.cust_num = src.cn AND rd.reserve_date = src.d
                                     AND rd.reserve_state IN ('I','H') AND rd.reserve_flag = 'D') THEN 1 ELSE 0 END AS "hasDreamlens",
                CASE WHEN EXISTS (SELECT 1 FROM raw.raw_crm_reservation rm
                                   WHERE rm.cust_num = src.cn AND rm.reserve_date = src.d
                                     AND rm.reserve_state IN ('I','H') AND rm.reserve_flag = 'M') THEN 1 ELSE 0 END AS "hasMedical"
            ) vis ON true
            CROSS JOIN LATERAL (SELECT TRIM(COALESCE(cu.job, '')) AS j) jj
            LEFT JOIN LATERAL (
              SELECT COALESCE(m2.category01_name, '') AS motiveL,
                     COALESCE(m2.category02_name, '') AS motiveM,
                     COALESCE(m2.category03_name, '') AS motiveS
              FROM raw.raw_crm_motive_new02 m2
              WHERE m2.cust_num = src.cn AND m2.idx = '1'
              ORDER BY m2.pkey DESC
              LIMIT 1
            ) mv ON true
            LEFT JOIN LATERAL (SELECT COALESCE(emp_name, '') AS nm FROM raw.raw_crm_employee WHERE emp_num = cu.my_counselor LIMIT 1) ec ON true
            LEFT JOIN LATERAL (SELECT COALESCE(emp_name, '') AS nm FROM raw.raw_crm_employee WHERE emp_num = cu.my_doctor    LIMIT 1) ed ON true
            LEFT JOIN LATERAL (SELECT COALESCE(emp_name, '') AS nm FROM raw.raw_crm_employee WHERE emp_num = cu.my_optometrist LIMIT 1) eo ON true
            -- 순수 외래 유입 제외
            WHERE NOT (
              src."isCat" = 0
              AND vis."hasMedical" = 0
              AND vis."hasDreamlens" = 0
              AND NOT EXISTS (SELECT 1 FROM raw.raw_crm_reservation ro
                              WHERE ro.cust_num = src.cn AND ro.reserve_flag = 'O'
                                AND ro.reserve_state <> 'C' AND ro.reserve_date >= src.d)
              AND NOT EXISTS (SELECT 1 FROM raw.raw_crm_operationdata od
                              WHERE od.cust_num = src.cn AND COALESCE(od.operation_date, '') <> ''
                                AND od.operation_date >= src.d)
            )
            -- 백내장 갈래와 중복 제거
            AND NOT (
              src."isCat" = 0
              AND vis."hasMedical" = 0
              AND vis."hasDreamlens" = 0
              AND EXISTS (SELECT 1 FROM raw.raw_crm_reservation rh
                          WHERE rh.cust_num = src.cn AND rh.reserve_date = src.d
                            AND rh.reserve_flag = 'H'
                            AND COALESCE(rh.reserve_jinryo, '') <> '3'
                            AND COALESCE(rh.reserve_seq, 0) <> 3
                            AND rh.reserve_state NOT IN ('C','Y'))
            )
            ORDER BY src.d, src."isCat", cu.cust_name
