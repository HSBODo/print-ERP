-- 월 전체 행 적재가 완료되지 않은 월만 집계 마트로 보충한다.
SELECT yr            AS "year",
       mo            AS "month",
       receipt_count AS "count",
       net           AS "net",
       claim_amount  AS "claim",
       salary_total  AS "salaryTotal",
       non_covered   AS "nonCovered"
FROM mart_medical_receipt_monthly
WHERE yr IN (:years)
  AND rows_complete = FALSE
ORDER BY yr, mo
