-- 차트번호로 CRM 연락처 조회 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/sms/select-crm-phone.sql — 전화번호 선택 규칙(CALL_NUM2 → CALL_NUM1 010 우선)은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · QUERY_DIRECT #1 (2026-10-06).
-- fail-safe: SmsTargetService 가 예외/빈값을 '번호 없음'으로 처리 → 운영 영향 없음.
SELECT
  REPLACE(REPLACE(
    CASE
      WHEN REPLACE(COALESCE(c.call_num2, ''), '-', '') LIKE '010%' THEN c.call_num2
      WHEN REPLACE(COALESCE(c.call_num1, ''), '-', '') LIKE '010%' THEN c.call_num1
      WHEN COALESCE(c.call_num2, '') <> '' THEN c.call_num2
      ELSE COALESCE(c.call_num1, '')
    END, '-', ''), ' ', '') AS phone
FROM raw.raw_crm_custom c
WHERE TRIM(c.cust_num) = :chartNo
LIMIT 1
