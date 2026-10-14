-- 검사 세션 모집단 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/fragments/fragment-exam-session-source.sql — 모집단 정의·함정은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
              -- 시력교정 · 드림렌즈: EXAM 행 (select-exam-list.sql 과 동일 필터)
              SELECT e.cust_num AS cn, e.exam_date AS d, 0 AS "isCat", CAST('' AS varchar(20)) AS "catClass"
              FROM raw.raw_crm_exam e
              JOIN raw.raw_crm_custom cux ON cux.cust_num = e.cust_num
              WHERE e.exam_date >= :from AND e.exam_date <= :to
                AND NOT (
                  COALESCE(cux.cust_name, '') LIKE '%테스트%'
                  OR LOWER(COALESCE(cux.cust_name, '')) LIKE '%test%'
                )
                AND NOT (
                  EXISTS (
                    SELECT 1 FROM raw.raw_crm_cataract_exam ce
                    WHERE ce.cust_num = e.cust_num AND ce.exam_date = e.exam_date
                  )
                  AND __EXAM_MEASUREMENTS_BLANK__
                )
                -- 백내장 갈래와 중복 제거 (2026-08-05) — select-exam-list.sql 과 동일 조건.
                AND NOT (
                  NOT EXISTS (
                    SELECT 1 FROM raw.raw_crm_reservation rmx
                    WHERE rmx.cust_num = e.cust_num AND rmx.reserve_date = e.exam_date
                      AND rmx.reserve_state IN ('I','H') AND rmx.reserve_flag IN ('M','D')
                  )
                  AND EXISTS (
                    SELECT 1 FROM raw.raw_crm_reservation rh
                    WHERE rh.cust_num = e.cust_num AND rh.reserve_date = e.exam_date
                      AND rh.reserve_flag = 'H'
                      AND COALESCE(rh.reserve_jinryo, '') <> '3'
                      AND COALESCE(rh.reserve_seq, 0) <> 3
                      AND rh.reserve_state NOT IN ('C','Y')
                  )
                )
                AND (
                  EXISTS (
                    SELECT 1 FROM raw.raw_crm_reservation rm
                    WHERE rm.cust_num = e.cust_num AND rm.reserve_date = e.exam_date
                      AND rm.reserve_state IN ('I','H') AND rm.reserve_flag = 'M'
                  )
                  OR EXISTS (
                    SELECT 1 FROM raw.raw_crm_reservation rd
                    WHERE rd.cust_num = e.cust_num AND rd.reserve_date = e.exam_date
                      AND rd.reserve_state IN ('I','H') AND rd.reserve_flag = 'D'
                  )
                  OR EXISTS (
                    SELECT 1 FROM raw.raw_crm_reservation ro
                    WHERE ro.cust_num = e.cust_num AND ro.reserve_flag = 'O'
                      AND ro.reserve_state <> 'C' AND ro.reserve_date >= e.exam_date
                  )
                  OR EXISTS (
                    SELECT 1 FROM raw.raw_crm_operationdata od
                    WHERE od.cust_num = e.cust_num AND COALESCE(od.operation_date, '') <> ''
                      AND od.operation_date >= e.exam_date
                  )
                )

              UNION ALL

              -- 백내장: 백내장검사 예약 내원 (select-cataract-exam-list.sql 과 동일 규칙)
              SELECT B.cust_num AS cn, D2.reserve_date AS d,
                     CASE WHEN opt.v = 1 AND (B.my_counselor = 'BS0808' OR cns.v = 1)
                          THEN 1 ELSE 0 END AS "isCat",
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
                       CASE WHEN opt.v = 1 AND (B.my_counselor = 'BS0808' OR cns.v = 1)
                            THEN 1 ELSE 0 END,
                       CASE WHEN opt.v = 1 AND B.my_counselor = 'BS0808' THEN '중단'
                            WHEN opt.v = 1 AND cns.v = 1                 THEN '백내장'
                            WHEN B.my_counselor = 'BS0808'               THEN '노안/FU'
                            ELSE '기타' END
