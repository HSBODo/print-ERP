-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/marketing/exam-date-candidates.sql
-- 이관: 2026-10-07 QUERY_DIRECT #2 (OverseasMarketing)
--
-- 방언 변환:
--   RESERVATION·CUSTOM → raw.raw_crm_<lower> · WITH(NOLOCK) 제거 · RTRIM → TRIM · ISNULL → COALESCE
--   CONVERT(varchar(10), CONVERT(date, x), 120) — reserve_date 는 raw 에서 이미 varchar.
--     원본이 varchar 이 아닌 datetime 가능성을 염두한 방어 캐스팅이었음. Postgres 에서는 SUBSTRING 1~10 로 통일.
--   파라미터 CONVERT(varchar(10), :from) 캐스팅은 Postgres 에서 불필요 — 바인딩 파라미터가 varchar 로 바인딩되므로 문자열 비교 가능.
--
-- ⚠️ reserve_date, birth_day 둘 다 character varying (ISO YYYY-MM-DD 형식 가정).
SELECT
    SUBSTRING(r.reserve_date FROM 1 FOR 10)      AS "eventDate",
    TRIM(r.cust_num)                             AS "customerNo",
    TRIM(COALESCE(c.cust_name, ''))              AS "name",
    COALESCE(c.birth_day, '')                    AS "birthDate"
FROM raw.raw_crm_reservation r
JOIN raw.raw_crm_custom c ON c.cust_num = r.cust_num
WHERE r.reserve_flag = 'M'
  AND r.reserve_state <> 'C'
  AND r.reserve_date >= :from
  AND r.reserve_date <  :toExclusive
  AND SUBSTRING(r.reserve_date FROM 1 FOR 10) IN (:values)
GROUP BY SUBSTRING(r.reserve_date FROM 1 FOR 10),
         TRIM(r.cust_num),
         TRIM(COALESCE(c.cust_name, '')),
         COALESCE(c.birth_day, '')
