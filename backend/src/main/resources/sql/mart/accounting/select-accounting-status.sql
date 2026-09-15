-- 회계 마트 적재 현황 — 화면 "데이터 기준" 표기용. 행이 없으면 NULL.
SELECT
    (SELECT TO_CHAR(MIN(receipt_date), 'YYYY-MM-DD') FROM list_medical_receipt)        AS "medicalFrom",
    (SELECT TO_CHAR(MAX(receipt_date), 'YYYY-MM-DD') FROM list_medical_receipt)        AS "medicalTo",
    (SELECT TO_CHAR(MAX(loaded_at), 'YYYY-MM-DD') FROM list_medical_receipt)           AS "medicalLoadedAt",
    (SELECT TO_CHAR(MIN(receipt_date), 'YYYY-MM-DD') FROM list_vision_receipt)         AS "visionFrom",
    (SELECT TO_CHAR(MAX(receipt_date), 'YYYY-MM-DD') FROM list_vision_receipt)         AS "visionTo",
    (SELECT TO_CHAR(MAX(loaded_at), 'YYYY-MM-DD') FROM list_vision_receipt)            AS "visionLoadedAt",
    (SELECT MIN(yr) FROM mart_medical_receipt_monthly)                                 AS "medicalMonthlyFromYear"
