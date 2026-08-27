-- =========================================================
-- MSSQL 원천 조회 — OPERATION_ACCUMULATED_EYE_COUNT (누적 안수)
--
-- 재적재 규약과 짝: BatchOrchestrator 가 넘긴 from..to 를 operation_date 반개구간(inclusive)
-- 으로 걸어 조회. 소급 흡수는 monthly-reconcile 이 전월 전체를 재조회하는 방식으로.
--
-- 별칭은 camelCase — 마트 Writer 가 그대로 :바인딩 파라미터로 사용한다.
--   (KEYS 배열과 1:1 매칭 · 순서 상관 없음)
-- =========================================================

SELECT
    id                        AS "id",
    CUST_NUM                  AS "custNum",
    CUSTOM_NAME               AS "customName",
    CUSTOM_PHONE              AS "customPhone",
    OPERATION_CATEGORY        AS "operationCategory",
    OPERATION_CODE            AS "operationCode",
    OPERATION_DATE            AS "operationDate",
    ACCUMULATED_EYE_COUNT     AS "accumulatedEyeCount",
    EYE_POSITION              AS "eyePosition",
    CREATE_DATE               AS "createDate",
    LASTMODIFIED_DATE         AS "lastModifiedDate",
    isActive                  AS "isActive"
FROM OPERATION_ACCUMULATED_EYE_COUNT
WHERE OPERATION_DATE >= :from
  AND OPERATION_DATE <  DATEADD(day, 1, CAST(:to AS DATE))
ORDER BY OPERATION_DATE ASC, ACCUMULATED_EYE_COUNT ASC
