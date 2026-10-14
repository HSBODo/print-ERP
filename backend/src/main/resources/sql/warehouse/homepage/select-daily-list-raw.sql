-- 홈페이지 일별 raw 건수 (주차 레포트용) · Postgres · 웨어하우스 라우팅.
-- MariaDB 정본: sql/homepage/mariadb/select-daily-list-raw.sql — 월별판과 필터·계산 동일.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Homepage 선제 이관 (2026-10-06).
SELECT TO_CHAR(reg_date, 'YYYY-MM-DD') AS d,
       COUNT(*)                        AS cnt
  FROM raw.raw_homepage_tbl_counsel
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND COALESCE(m_nm, '') NOT LIKE '%테스트%'
   AND COALESCE(m_nm, '') NOT LIKE '%TEST%'
   AND reg_date >= CAST(:from AS timestamp)
   AND reg_date <  CAST(:to AS date) + INTERVAL '1 day'
 GROUP BY TO_CHAR(reg_date, 'YYYY-MM-DD')
 ORDER BY d
