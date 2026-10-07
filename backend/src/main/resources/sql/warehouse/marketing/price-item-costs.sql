-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/price-item-costs.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환:
--   COSTPRICE·PrcItmLst → raw.raw_crm_<lower> · WITH(NOLOCK) 제거 · RTRIM → TRIM
SELECT TRIM(cp.cust_num) AS "customerNo",
       CASE
           WHEN pr.prccod = 'O'  THEN 'surgery'
           WHEN pr.prccod = '33' THEN 'exam'
           ELSE 'other'
       END                                 AS "category",
       SUM(pr.prcitmqty * pr.prcitmprc)    AS "total"
FROM raw.raw_crm_costprice cp
JOIN raw.raw_crm_prcitmlst pr
  ON cp.cust_num = pr.prccusnum
 AND cp.seq      = pr.prcseq
WHERE cp.cust_num IN (:customerNos)
  AND pr.prcitmprc <> 0
  AND cp.paystt <> 'a'
GROUP BY cp.cust_num,
         CASE
             WHEN pr.prccod = 'O'  THEN 'surgery'
             WHEN pr.prccod = '33' THEN 'exam'
             ELSE 'other'
         END
