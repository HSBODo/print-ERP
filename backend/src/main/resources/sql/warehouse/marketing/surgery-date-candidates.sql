-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/surgery-date-candidates.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환 요약: exam-date-candidates.sql 와 동일 패턴 (OPERATIONDATA 로 교체).
SELECT
    SUBSTRING(o.operation_date FROM 1 FOR 10)    AS "eventDate",
    TRIM(o.cust_num)                             AS "customerNo",
    TRIM(COALESCE(c.cust_name, ''))              AS "name",
    COALESCE(c.birth_day, '')                    AS "birthDate"
FROM raw.raw_crm_operationdata o
JOIN raw.raw_crm_custom c ON c.cust_num = o.cust_num
WHERE (COALESCE(o.operationr, '') <> '' OR COALESCE(o.operationl, '') <> '')
  AND o.operation_date >= :from
  AND o.operation_date <  :toExclusive
  AND SUBSTRING(o.operation_date FROM 1 FOR 10) IN (:values)
GROUP BY SUBSTRING(o.operation_date FROM 1 FOR 10),
         TRIM(o.cust_num),
         TRIM(COALESCE(c.cust_name, '')),
         COALESCE(c.birth_day, '')
