-- 추이 달력 · 등록일 기준 — 그 날 등록된 검사예약 수와 그중 예약일이 바뀐 수 (구분별).
SELECT
    TO_CHAR(registered_at, 'YYYY-MM-DD')                    AS "day",
    COALESCE(branch, '')                                    AS "branch",
    COUNT(*)::INT                                           AS "total",
    SUM(CASE WHEN change_count >= 1 THEN 1 ELSE 0 END)::INT AS "changed"
  FROM list_reservation_change
 WHERE registered_at >= CAST(:from AS DATE)
   AND registered_at <= CAST(:to   AS DATE)
 GROUP BY registered_at, branch
 ORDER BY registered_at, branch
