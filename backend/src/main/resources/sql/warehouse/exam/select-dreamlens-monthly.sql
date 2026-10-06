            -- 드림렌즈 검사 월별 집계 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/exam/select-dreamlens-monthly.sql — 모집단 근거 그쪽 참고.
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
              AND EXISTS (SELECT 1 FROM raw.raw_crm_reservation rd
                          WHERE rd.cust_num = e.cust_num AND rd.reserve_date = e.exam_date
                            AND rd.reserve_state IN ('I','H') AND rd.reserve_flag = 'D'
                          )
              AND NOT EXISTS (SELECT 1 FROM raw.raw_crm_reservation rm
                              WHERE rm.cust_num = e.cust_num AND rm.reserve_date = e.exam_date
                                AND rm.reserve_state IN ('I','H') AND rm.reserve_flag = 'M')
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
