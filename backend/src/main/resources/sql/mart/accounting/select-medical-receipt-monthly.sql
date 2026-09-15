-- 진료 매출 월별 (집계 마트) — 행 데이터가 없는 연도(2023~2025) 와 연도 비교 그래프용.
SELECT yr            AS "year",
       mo            AS "month",
       receipt_count AS "count",
       net           AS "net",
       claim_amount  AS "claim",
       salary_total  AS "salaryTotal",
       non_covered   AS "nonCovered"
FROM mart_medical_receipt_monthly
WHERE yr IN (:years)
ORDER BY yr, mo
