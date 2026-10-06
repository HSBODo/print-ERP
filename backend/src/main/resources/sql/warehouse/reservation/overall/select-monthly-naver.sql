-- 온라인 예약 구성요소 ① 네이버 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/reservation/overall/select-monthly-naver.sql — 기준 근거는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave 2 (2026-10-06).
SELECT EXTRACT(YEAR FROM r.inserteddatetime)::int  AS yr,
       EXTRACT(MONTH FROM r.inserteddatetime)::int AS mo,
       COUNT(DISTINCT r.reserve_num) AS naver_cnt
FROM raw.raw_crm_reservation r
WHERE r.inserteddatetime >= CAST(:from AS timestamp)
  AND r.inserteddatetime <= CAST(:to AS timestamp)
  AND r.reserve_path = 'NAVER'
  AND r.reserve_flag = 'M'
  AND r.reserve_jinryo IN ('', '5', '6', '7')
  AND COALESCE(r.reserve_state, '') <> 'C'
GROUP BY EXTRACT(YEAR FROM r.inserteddatetime), EXTRACT(MONTH FROM r.inserteddatetime)
ORDER BY yr, mo
