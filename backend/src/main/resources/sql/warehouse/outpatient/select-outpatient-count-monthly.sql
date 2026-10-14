-- 외래수 월별 집계 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/outpatient/select-outpatient-count-monthly.sql — 운영 기준 등 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave (2026-10-06).
-- OutpatientReconcileService 전용(파이프라인 밖). reserve_date varchar(YYYY-MM-DD).
SELECT CAST(SUBSTRING(r.reserve_date FROM 1 FOR 4) AS INT) AS yr,
       CAST(SUBSTRING(r.reserve_date FROM 6 FOR 2) AS INT) AS mo,
       COUNT(*) AS cnt
FROM raw.raw_crm_reservation r
JOIN raw.raw_crm_custom cu ON r.cust_num = cu.cust_num
WHERE r.reserve_date >= :from AND r.reserve_date <= :to
  AND r.reserve_flag = 'F'
  AND r.reserve_state IN ('I','H')
  AND NOT (
    COALESCE(cu.cust_name, '') LIKE '%테스트%'
    OR LOWER(COALESCE(cu.cust_name, '')) LIKE '%test%'
  )
GROUP BY CAST(SUBSTRING(r.reserve_date FROM 1 FOR 4) AS INT),
         CAST(SUBSTRING(r.reserve_date FROM 6 FOR 2) AS INT)
ORDER BY yr, mo
