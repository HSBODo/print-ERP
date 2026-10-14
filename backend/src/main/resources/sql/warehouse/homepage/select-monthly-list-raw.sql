-- 홈페이지 월별 raw 건수 (리스트 화면 정합) · Postgres · 웨어하우스 라우팅.
-- MariaDB 정본: sql/homepage/mariadb/select-monthly-list-raw.sql — 필터·회귀 기준은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Homepage 선제 이관 (2026-10-06).
SELECT EXTRACT(YEAR FROM reg_date)::int  AS yr,
       EXTRACT(MONTH FROM reg_date)::int AS mo,
       COUNT(*)                          AS cnt
  FROM raw.raw_homepage_tbl_counsel
 WHERE category = 'COUNSELONLINE'
   AND del_tf = 'N'
   AND COALESCE(m_nm, '') NOT LIKE '%테스트%'
   AND COALESCE(m_nm, '') NOT LIKE '%TEST%'
   AND reg_date >= CAST(:from AS timestamp)
   AND reg_date <  CAST(:to AS date) + INTERVAL '1 day'
 GROUP BY EXTRACT(YEAR FROM reg_date), EXTRACT(MONTH FROM reg_date)
 ORDER BY yr, mo
