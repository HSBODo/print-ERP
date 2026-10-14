-- 백내장 예약률 월별 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/exam/select-cataract-reservation-rate-monthly.sql — 정의·기간제한 근거 그쪽 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
-- Fragment 미사용. reserve_date varchar(YYYY-MM-DD).
            SELECT CAST(SUBSTRING(base.ym FROM 1 FOR 4) AS INT) AS yr,
                   CAST(SUBSTRING(base.ym FROM 6 FOR 2) AS INT) AS mo,
                   COUNT(*) AS "examCount",
                   SUM(base."hasSurgeryBooking") AS "surgeryBookedCount"
            FROM (
                SELECT CH.ym,
                       CASE WHEN EXISTS (
                                SELECT 1
                                FROM raw.raw_crm_reservation op
                                WHERE op.cust_num = CH.cust_num
                                  AND op.reserve_flag = 'O'
                                  AND op.reserve_jinryo = '4'
                                  AND op.reserve_state <> 'C'
                                  AND op.reserve_date >= CH."firstExamDate"
                            ) THEN 1 ELSE 0 END AS "hasSurgeryBooking"
                FROM (
                    SELECT B.cust_num,
                           SUBSTRING(D.reserve_date FROM 1 FOR 7) AS ym,
                           MIN(D.reserve_date)                    AS "firstExamDate"
                    FROM raw.raw_crm_custom B
                    JOIN raw.raw_crm_reservation D ON D.cust_num = B.cust_num
                    WHERE D.reserve_date >= :from AND D.reserve_date <= :to
                      AND D.reserve_flag = 'H'
                      AND COALESCE(D.reserve_jinryo, '') <> '3'
                      AND COALESCE(D.reserve_seq, 0) <> 3
                      AND D.reserve_state NOT IN ('C', 'Y')
                      AND B.cust_num <> '9999999999999'
                      AND NOT (
                        COALESCE(B.cust_name, '') LIKE '%테스트%'
                        OR LOWER(COALESCE(B.cust_name, '')) LIKE '%test%'
                      )
                    GROUP BY B.cust_num, SUBSTRING(D.reserve_date FROM 1 FOR 7)
                ) CH
                JOIN raw.raw_crm_custom B ON B.cust_num = CH.cust_num
                WHERE EXISTS (SELECT 1 FROM raw.raw_crm_employee E WHERE E.emp_num = B.my_optometrist)
                  AND (
                    B.my_counselor = 'BS0808'
                    OR EXISTS (SELECT 1 FROM raw.raw_crm_employee E WHERE E.emp_num = B.my_counselor)
                  )
            ) base
            GROUP BY base.ym
            ORDER BY yr, mo
