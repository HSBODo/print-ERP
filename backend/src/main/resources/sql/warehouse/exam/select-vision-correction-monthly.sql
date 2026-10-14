            -- 시력교정 검사 월별 집계 (사람 단위) · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/exam/select-vision-correction-monthly.sql — 모집단 근거 그쪽 참고.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            -- __EXAM_MEASUREMENTS_BLANK__ 는 SqlFragments.examMeasurementsBlankPredicate("e", true) 로 치환.
            SELECT CAST(SUBSTRING(e.exam_date FROM 1 FOR 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.exam_date FROM 6 FOR 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM raw.raw_crm_exam e
            JOIN raw.raw_crm_custom cu ON e.cust_num = cu.cust_num
            WHERE e.exam_date >= :from AND e.exam_date <= :to
              AND NOT (
                COALESCE(cu.cust_name, '') LIKE '%테스트%'
                OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
              )
              AND NOT (
                    EXISTS (SELECT 1 FROM raw.raw_crm_reservation rd
                            WHERE rd.cust_num = e.cust_num AND rd.reserve_date = e.exam_date
                              AND rd.reserve_state IN ('I','H') AND rd.reserve_flag = 'D'
                    )
                AND NOT EXISTS (SELECT 1 FROM raw.raw_crm_reservation rm
                            WHERE rm.cust_num = e.cust_num AND rm.reserve_date = e.exam_date
                              AND rm.reserve_state IN ('I','H') AND rm.reserve_flag = 'M')
              )
              -- 순수 외래 유입 제외: 그날 검사(M) 내원 또는 수술 연계가 있어야 시력교정 검사자로 센다.
              AND (
                    EXISTS (SELECT 1 FROM raw.raw_crm_reservation rm3
                            WHERE rm3.cust_num = e.cust_num AND rm3.reserve_date = e.exam_date
                              AND rm3.reserve_state IN ('I','H') AND rm3.reserve_flag = 'M')
                 OR EXISTS (SELECT 1 FROM raw.raw_crm_reservation ro
                            WHERE ro.cust_num = e.cust_num AND ro.reserve_flag = 'O'
                              AND ro.reserve_state <> 'C' AND ro.reserve_date >= e.exam_date)
                 OR EXISTS (SELECT 1 FROM raw.raw_crm_operationdata od
                            WHERE od.cust_num = e.cust_num AND COALESCE(od.operation_date, '') <> ''
                              AND od.operation_date >= e.exam_date)
              )
              AND NOT (
                EXISTS (
                  SELECT 1
                  FROM raw.raw_crm_cataract_exam ce
                  WHERE ce.cust_num = e.cust_num
                    AND ce.exam_date = e.exam_date
                )
                AND __EXAM_MEASUREMENTS_BLANK__
              )
            GROUP BY CAST(SUBSTRING(e.exam_date FROM 1 FOR 4) AS INT), CAST(SUBSTRING(e.exam_date FROM 6 FOR 2) AS INT)
            ORDER BY yr, mo
