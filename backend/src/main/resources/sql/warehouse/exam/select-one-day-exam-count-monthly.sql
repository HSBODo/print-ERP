-- 원데이 검사수 월간 집계 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/exam/select-one-day-exam-count-monthly.sql — 운영 기준 그쪽 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
-- Fragment 미사용 (단독 변환). exam_date·reserve_date varchar(YYYY-MM-DD).
            SELECT yr, mo, SUM(cnt) AS cnt
            FROM (
            SELECT CAST(SUBSTRING(e.exam_date FROM 1 FOR 4) AS INT) AS yr,
                   CAST(SUBSTRING(e.exam_date FROM 6 FOR 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM raw.raw_crm_exam e
            JOIN raw.raw_crm_custom cu ON cu.cust_num = e.cust_num
            WHERE e.exam_date >= :from AND e.exam_date <= :to
              AND NOT (
                COALESCE(cu.cust_name, '') LIKE '%테스트%'
                OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
                OR COALESCE(e.exam_memo, '') LIKE '%테스트%'
                OR LOWER(COALESCE(e.exam_memo, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1
                FROM raw.raw_crm_reservation r
                WHERE r.cust_num = e.cust_num
                  AND r.reserve_date = e.exam_date
                  AND r.reserve_flag = 'M'
                  AND r.reserve_state IN ('I','H')
                  AND r.reserve_jinryo IN ('5','7')
                  AND LOWER(COALESCE(r.reserve_num, '')) NOT LIKE '%test%'
                  AND LOWER(COALESCE(r.reserve_num, '')) NOT LIKE '%kiosktest%'
              )
            GROUP BY CAST(SUBSTRING(e.exam_date FROM 1 FOR 4) AS INT),
                     CAST(SUBSTRING(e.exam_date FROM 6 FOR 2) AS INT)

            UNION ALL

            -- 백내장 원데이 — 고객 × 검사일 단위로 접은 뒤 그날 예약 중 진료구분 7·9 가 하나라도 있으면 원데이.
            SELECT CAST(SUBSTRING(c.d FROM 1 FOR 4) AS INT) AS yr,
                   CAST(SUBSTRING(c.d FROM 6 FOR 2) AS INT) AS mo,
                   COUNT(*) AS cnt
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
            WHERE c."isOneDay" = 1
            GROUP BY CAST(SUBSTRING(c.d FROM 1 FOR 4) AS INT),
                     CAST(SUBSTRING(c.d FROM 6 FOR 2) AS INT)
            ) u
            GROUP BY yr, mo
            ORDER BY yr, mo
