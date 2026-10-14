-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/customer-candidates.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환:
--   CUSTOM → raw.raw_crm_custom · WITH(NOLOCK) 제거 · ISNULL → COALESCE · RTRIM → TRIM
--
-- %s 는 Repository.findCandidates(predicate) 가 치환 (예: c.CUST_NUM IN (:values)).
--   Postgres 는 unquoted 식별자를 lowercase 로 폴딩하므로 CUST_NUM/CUST_NAME 그대로 두어도 매칭.
SELECT TRIM(c.cust_num)                 AS "customerNo",
       TRIM(COALESCE(c.cust_name, ''))  AS "name",
       COALESCE(c.birth_day, '')        AS "birthDate",
       COALESCE(c.call_num2, '')        AS "contact",
       COALESCE(c.email, '')            AS "email"
FROM raw.raw_crm_custom c
WHERE %s
