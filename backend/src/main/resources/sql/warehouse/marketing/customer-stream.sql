-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/customer-stream.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환:
--   CUSTOM → raw.raw_crm_custom · WITH(NOLOCK) 제거 · ISNULL → COALESCE · RTRIM → TRIM
--   alias double-quote 필수 — Repository 가 rs.getString("customerNo") 등 camelCase 로 접근.
SELECT TRIM(c.cust_num)                  AS "customerNo",
       TRIM(COALESCE(c.cust_name, ''))   AS "name",
       COALESCE(c.birth_day, '')         AS "birthDate",
       COALESCE(c.call_num2, '')         AS "contact",
       COALESCE(c.email, '')             AS "email"
FROM raw.raw_crm_custom c
