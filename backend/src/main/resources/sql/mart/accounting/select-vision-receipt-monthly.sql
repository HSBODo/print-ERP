-- 시력교정 매출 월별 — 건수는 취소행 포함 행수(원형 집계와 동일), 금액은 취소 상계 순액.
SELECT EXTRACT(YEAR  FROM receipt_date)::INT AS "year",
       EXTRACT(MONTH FROM receipt_date)::INT AS "month",
       COUNT(*)::INT                          AS "count",
       COALESCE(SUM(amount), 0)               AS "amount"
FROM list_vision_receipt
WHERE EXTRACT(YEAR FROM receipt_date) IN (:years)
GROUP BY 1, 2
ORDER BY 1, 2
