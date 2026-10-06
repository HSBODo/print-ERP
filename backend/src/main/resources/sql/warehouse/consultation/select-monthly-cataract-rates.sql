-- 월별 백내장 수술전환율 원본 정의 (예약 접수 기준) · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/consultation/select-monthly-cataract-rates.sql — 배치·화면 정의와의 차이는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
-- ConsultationReconcileService 전용(파이프라인 밖, 대사용). reserve_date varchar(YYYY-MM-DD).
            SELECT
                CAST(SUBSTRING(D.reserve_date FROM 1 FOR 4) AS INT) AS yr,
                CAST(SUBSTRING(D.reserve_date FROM 6 FOR 2) AS INT) AS mo,
                COUNT(DISTINCT D.cust_num) AS "examCount",
                COUNT(DISTINCT CASE WHEN op.min_op_rsv IS NOT NULL THEN D.cust_num END) AS "surgeryBookedCount",
                COUNT(DISTINCT CASE WHEN B.my_optometrist IS NOT NULL
                                     AND B.my_optometrist <> ''
                                     AND B.my_counselor = 'BS0808' THEN D.cust_num END) AS "stoppedCount"
            FROM raw.raw_crm_reservation D
            INNER JOIN raw.raw_crm_custom B ON B.cust_num = D.cust_num
            LEFT JOIN (
                SELECT cust_num, MIN(reserve_date) AS min_op_rsv
                  FROM raw.raw_crm_reservation
                 WHERE reserve_flag = 'O' AND reserve_jinryo = '4' AND reserve_state <> 'C'
                 GROUP BY cust_num
            ) op ON op.cust_num = D.cust_num
            WHERE D.reserve_date >= :from AND D.reserve_date <= :to
                AND D.reserve_flag = 'H'
                AND D.reserve_jinryo <> '3'
                AND D.reserve_state <> 'C'
                AND NOT (D.reserve_flag = 'H' AND D.reserve_jinryo = '1' AND D.reserve_seq = 3)
                AND D.cust_num <> '9999999999999'
            GROUP BY SUBSTRING(D.reserve_date FROM 1 FOR 4), SUBSTRING(D.reserve_date FROM 6 FOR 2)
            ORDER BY yr, mo
