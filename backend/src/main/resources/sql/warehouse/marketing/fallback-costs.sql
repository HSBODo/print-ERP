-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/fallback-costs.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환:
--   COSTPRICE·OPERATIONDATA → raw.raw_crm_<lower> · WITH(NOLOCK) 제거 · RTRIM → TRIM
--   ;WITH 선두 세미콜론 제거 (Postgres 는 불필요).
WITH classified AS (
    SELECT TRIM(cp.cust_num) AS "customerNo",
           CASE WHEN EXISTS (
               SELECT 1
               FROM raw.raw_crm_operationdata o
               WHERE o.cust_num       = cp.cust_num
                 AND o.operation_date = cp.cost_date
           ) THEN 'surgery' ELSE 'exam' END AS "category",
           cp.cost_price
    FROM raw.raw_crm_costprice cp
    -- ⚠️ TRIM 좌변: costprice.cust_num(13) 공백 패딩, Java 쪽 :customerNos 는 trimmed.
    -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #12
    WHERE TRIM(cp.cust_num) IN (:customerNos)
      AND cp.cost_price > 0
)
SELECT "customerNo", "category", SUM(cost_price) AS "total"
FROM classified
GROUP BY "customerNo", "category"
