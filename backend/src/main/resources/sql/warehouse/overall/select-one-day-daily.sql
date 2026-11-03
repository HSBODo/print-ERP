-- 원데이 검사수 + 원데이 수술예약 일별 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/overall/select-one-day-daily.sql — 분자 정의 교체(2026-08-06) 등은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
-- Fragment 미사용.
            SELECT d, SUM("oneDay") AS "oneDay", SUM("oneDayBooked") AS "oneDayBooked"
            FROM (
            SELECT e.exam_date AS d,
                   COUNT(*) AS "oneDay",
                   SUM(CASE WHEN booked.hit IS NULL THEN 0 ELSE 1 END) AS "oneDayBooked"
            FROM raw.raw_crm_exam e
            JOIN raw.raw_crm_custom cu ON cu.cust_num = e.cust_num
            LEFT JOIN LATERAL (
                SELECT 1 AS hit
                FROM raw.raw_crm_reservation op
                WHERE op.cust_num = e.cust_num
                  AND op.reserve_flag = 'O'
                  AND op.reserve_state <> 'C'
                  AND op.reserve_date >= e.exam_date
                LIMIT 1
            ) booked ON true
            WHERE e.exam_date >= :from AND e.exam_date <= :to
              AND NOT (
                COALESCE(cu.cust_name, '') LIKE '%테스트%'
                OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                OR COALESCE(e.exam_memo, '') LIKE '%테스트%'
                OR LOWER(COALESCE(e.exam_memo, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1 FROM raw.raw_crm_reservation r
                WHERE r.cust_num = e.cust_num
                  AND r.reserve_date = e.exam_date
                  AND r.reserve_flag = 'M'
                  AND r.reserve_state IN ('I','H')
                  AND r.reserve_jinryo IN ('5','7')
                  AND LOWER(COALESCE(r.reserve_num, '')) NOT LIKE '%test%'
                  AND LOWER(COALESCE(r.reserve_num, '')) NOT LIKE '%kiosktest%'
              )
            GROUP BY e.exam_date

            UNION ALL

            -- 백내장 원데이 — 고객 × 검사일로 접은 뒤 그날 예약에 진료구분 7·9 가 있으면 원데이.
            SELECT bk.d AS d,
                   COUNT(*) AS "oneDay",
                   SUM(bk.booked) AS "oneDayBooked"
            FROM (
                SELECT c.cn, c.d, c."isOneDay",
                       CASE WHEN EXISTS (
                           SELECT 1 FROM raw.raw_crm_reservation op
                           WHERE op.cust_num = c.cn
                             AND op.reserve_flag = 'O'
                             AND op.reserve_state <> 'C'
                             AND op.reserve_date >= c.d
                       ) THEN 1 ELSE 0 END AS booked
                FROM (
                SELECT B.cust_num AS cn, D2.reserve_date AS d,
                       MAX(CASE WHEN COALESCE(D2.reserve_jinryo, '') IN ('7', '9') THEN 1 ELSE 0 END) AS "isOneDay"
                FROM raw.raw_crm_custom B
                JOIN raw.raw_crm_reservation D2 ON D2.cust_num = B.cust_num
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
                GROUP BY B.cust_num, D2.reserve_date
                ) c
            ) bk
            WHERE bk."isOneDay" = 1
            GROUP BY bk.d
            ) u
            GROUP BY d
            ORDER BY d
