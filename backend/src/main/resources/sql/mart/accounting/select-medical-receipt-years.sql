-- 행 데이터가 있는 연도 목록 — 월별 조회 시 "행에서 재집계할 연도" 와 "집계 마트로 볼 연도" 를 가른다.
SELECT DISTINCT EXTRACT(YEAR FROM receipt_date)::INT AS "year"
FROM list_medical_receipt
ORDER BY 1
