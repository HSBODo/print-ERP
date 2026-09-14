-- =========================================================
-- 누적 안수 리스트 마트 — range delete (재적재 첫 단계).
-- 반개구간 규약(소스 SELECT 와 동일): operation_date >= from AND < to + 1 day.
-- =========================================================

DELETE FROM list_accumulated_eyes
 WHERE operation_date >= CAST(:from AS DATE)
   AND operation_date <  CAST(:to   AS DATE) + INTERVAL '1 day'
