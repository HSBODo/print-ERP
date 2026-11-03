-- =========================================================
-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/surgery/select-accumulated-eyes.sql
-- 이관 이력: 2026-09-29 A2 (AccumulatedEyeMartJob 배치 read-side).
--
-- 방언 변환:
--   OPERATION_ACCUMULATED_EYE_COUNT → raw.raw_crm_operation_accumulated_eye_count
--   DATEADD(day, 1, CAST(:to AS DATE)) → CAST(:to AS date) + interval '1 day'
--   컬럼 소문자 폴딩 (LASTMODIFIED_DATE → lastmodified_date, isActive → isactive)
--
-- 별칭은 camelCase 그대로 (double-quoted) — 마트 Writer 가 :바인딩 파라미터로 사용.
-- =========================================================

SELECT
    id                                       AS "id",
    cust_num                                 AS "custNum",
    custom_name                              AS "customName",
    custom_phone                             AS "customPhone",
    operation_category                       AS "operationCategory",
    operation_code                           AS "operationCode",
    operation_date                           AS "operationDate",
    accumulated_eye_count                    AS "accumulatedEyeCount",
    eye_position                             AS "eyePosition",
    create_date                              AS "createDate",
    lastmodified_date                        AS "lastModifiedDate",
    isactive                                 AS "isActive"
FROM raw.raw_crm_operation_accumulated_eye_count
WHERE operation_date >= CAST(:from AS date)
  AND operation_date <  CAST(:to AS date) + interval '1 day'
ORDER BY operation_date ASC, accumulated_eye_count ASC
