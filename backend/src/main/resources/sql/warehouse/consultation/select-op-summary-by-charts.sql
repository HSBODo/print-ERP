-- 수술 요약 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/consultation/select-op-summary-by-charts.sql — 계약·반환 컬럼은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 (2026-09-30).
SELECT
    od.cust_num            AS "chartNo",
    MIN(od.operation_date) AS "minOpDate",
    MAX(od.operation_date) AS "maxOpDate"
  FROM raw.raw_crm_operationdata od
 WHERE od.cust_num IN (:chartNos)
   AND COALESCE(od.operation_date, '') <> ''
 GROUP BY od.cust_num
