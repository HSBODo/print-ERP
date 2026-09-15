-- 진료 매출 월별 (행 마트에서 재집계) — 구분(외래/입원/백내장) 필터가 걸리는 유일한 경로.
-- 실수납합계 = 일련번호 98(환불금) 이면 −refund, 아니면 actual_paid + outstanding_recovered (화면 합계행과 같은 규칙).
--   :receiptType  '' 이면 전체, 아니면 수납구분 일치 (외래/입원)
--   :cataract     TRUE 면 매출구분 입원·입원외 (백내장 파트)
SELECT m.yr AS "year",
       m.mo AS "month",
       COUNT(r.id)::INT AS "count",
       COALESCE(SUM(CASE WHEN serial_no = 98 THEN -r.refund ELSE actual_paid + r.outstanding_recovered END), 0) AS "net",
       COALESCE(SUM(r.claim_amount), 0)      AS "claim",
       COALESCE(SUM(r.salary_total), 0)      AS "salaryTotal",
       COALESCE(SUM(r.non_covered), 0)       AS "nonCovered"
FROM mart_medical_receipt_monthly m
LEFT JOIN list_medical_receipt r
  ON receipt_date >= MAKE_DATE(m.yr, m.mo, 1)
  AND receipt_date < MAKE_DATE(m.yr, m.mo, 1) + INTERVAL '1 month'
  AND (CAST(:receiptType AS TEXT) = '' OR receipt_type = CAST(:receiptType AS TEXT))
  AND (CAST(:cataract AS BOOLEAN) = FALSE OR revenue_type IN ('입원', '입원외'))
WHERE m.yr IN (:years) AND m.rows_complete = TRUE
GROUP BY 1, 2
ORDER BY 1, 2
