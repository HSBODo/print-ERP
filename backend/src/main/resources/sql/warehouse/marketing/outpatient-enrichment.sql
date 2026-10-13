-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/outpatient-enrichment.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환:
--   RESERVATION·OPERATIONDATA·COSTPRICE → raw.raw_crm_<lower> · WITH(NOLOCK) 제거
--   CROSS APPLY (SELECT 집계 · 서브쿼리 메모) → LATERAL + string_agg 로 평탄화
--   FOR XML PATH('') + STUFF(..) 로 memo 를 ' / ' 조인한 MSSQL 관용구를 Postgres string_agg 로 교체
--   CONVERT(varchar(10), x, 120) — reserve_date 는 varchar 이미 YYYY-MM-DD 가정 → SUBSTRING 1~10
--   ROW_NUMBER() OVER (...) 는 양쪽 동일
WITH visit_dates AS (
    SELECT r.cust_num, r.reserve_date
    FROM raw.raw_crm_reservation r
    WHERE r.reserve_flag IN ('F', 'D')
      AND r.reserve_state <> 'C'
      -- ⚠️ TRIM 좌변: reservation.cust_num(13) 공백 패딩, Java 쪽 :customerNos 는 trimmed.
      -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #11
      AND TRIM(r.cust_num) IN (:customerNos)
      AND NOT EXISTS (
          SELECT 1
          FROM raw.raw_crm_operationdata o
          WHERE o.cust_num       = r.cust_num
            AND o.operation_date = r.reserve_date
      )
    GROUP BY r.cust_num, r.reserve_date
),
paid_visits AS (
    SELECT TRIM(vd.cust_num)                           AS "customerNo",
           SUBSTRING(vd.reserve_date FROM 1 FOR 10)    AS "visitDate",
           cp_agg."totalCost",
           cp_agg."memos",
           ROW_NUMBER() OVER (
               PARTITION BY vd.cust_num ORDER BY vd.reserve_date
           ) AS "rowNumber"
    FROM visit_dates vd
    CROSS JOIN LATERAL (
        SELECT SUM(cp.cost_price) AS "totalCost",
               (SELECT STRING_AGG(TRIM(cp2.cost_memo), ' / ')
                  FROM raw.raw_crm_costprice cp2
                 WHERE cp2.cust_num  = vd.cust_num
                   AND cp2.cost_date = vd.reserve_date
                   AND COALESCE(TRIM(cp2.cost_memo), '') <> '') AS "memos"
        FROM raw.raw_crm_costprice cp
        WHERE cp.cust_num  = vd.cust_num
          AND cp.cost_date = vd.reserve_date
          AND cp.cost_price > 0
    ) cp_agg
    WHERE cp_agg."totalCost" > 0
)
SELECT "customerNo",
       "rowNumber",
       "visitDate",
       "totalCost" AS "visitCost",
       COALESCE("memos", '') AS "visitMemo"
FROM paid_visits
WHERE "rowNumber" <= 3
