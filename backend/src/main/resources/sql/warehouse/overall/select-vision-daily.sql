            -- 시력교정 검사+수술예약 일별 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/overall/select-vision-daily.sql.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            -- __EXAM_MEASUREMENTS_BLANK__ 는 SqlFragments.examMeasurementsBlankPredicate("e", true) 로 치환.
            SELECT base.d AS d,
                   COUNT(*) AS "examCount",
                   SUM(CASE WHEN base."hasSurgeryBooking" = 1 THEN 1 ELSE 0 END) AS "surgeryBooked"
            FROM (
                SELECT e.exam_date AS d,
                       CASE WHEN op."hasSurgeryBooking" IS NULL THEN 0 ELSE 1 END AS "hasSurgeryBooking"
                FROM raw.raw_crm_exam e
                JOIN raw.raw_crm_custom cu ON e.cust_num = cu.cust_num
                LEFT JOIN LATERAL (
                    SELECT 1 AS "hasSurgeryBooking"
                    FROM raw.raw_crm_reservation op
                    WHERE op.cust_num = e.cust_num
                      AND op.reserve_flag = 'O'
                      AND op.reserve_state <> 'C'
                    LIMIT 1
                ) op ON true
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
                  -- 순수 외래 유입 제외
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
            ) base
            GROUP BY base.d
            ORDER BY base.d
