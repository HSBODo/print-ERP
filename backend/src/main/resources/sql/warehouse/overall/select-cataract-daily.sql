            -- 백내장 추천 눈 수 + 수술예약 일별 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/overall/select-cataract-daily.sql.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            -- Fragment 미사용.
            SELECT base.d AS d,
                   SUM(base."rightEye") + SUM(base."leftEye") AS "examCount",
                   SUM(CASE WHEN (base."rightEye" = 1 OR base."leftEye" = 1)
                              AND base."hasSurgeryBooking" = 1 THEN 1 ELSE 0 END) AS "surgeryBooked"
            FROM (
                SELECT ce.exam_date AS d,
                       CASE WHEN NULLIF(TRIM(COALESCE(ce.operationr, '')), '') IS NOT NULL THEN 1 ELSE 0 END AS "rightEye",
                       CASE WHEN NULLIF(TRIM(COALESCE(ce.operationl, '')), '') IS NOT NULL THEN 1 ELSE 0 END AS "leftEye",
                       CASE WHEN op."hasSurgeryBooking" IS NULL THEN 0 ELSE 1 END AS "hasSurgeryBooking"
                FROM raw.raw_crm_cataract_exam ce
                JOIN raw.raw_crm_custom cu ON ce.cust_num = cu.cust_num
                LEFT JOIN LATERAL (
                    SELECT 1 AS "hasSurgeryBooking"
                    FROM raw.raw_crm_reservation op
                    WHERE op.cust_num = ce.cust_num
                      AND op.reserve_flag = 'O'
                      AND op.reserve_state <> 'C'
                    LIMIT 1
                ) op ON true
                WHERE ce.exam_date >= :from AND ce.exam_date <= :to
                  AND (ce.stop_yn IS NULL OR ce.stop_yn <> 'Y')
                  AND (ce.cancel_cd IS NULL OR TRIM(ce.cancel_cd) = '')
                  AND NOT (
                    COALESCE(cu.cust_name, '') LIKE '%테스트%'
                    OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                  )
                  AND EXISTS (
                    SELECT 1
                    FROM raw.raw_crm_reservation r
                    WHERE r.cust_num = ce.cust_num
                      AND r.reserve_date = ce.exam_date
                      AND r.reserve_state IN ('I','H')
                      AND r.reserve_flag = 'H'
                  )
            ) base
            GROUP BY base.d
            ORDER BY base.d
