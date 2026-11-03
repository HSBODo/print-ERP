-- 홈페이지 마지막 등록일시 · Postgres · 웨어하우스 라우팅.
-- MariaDB 정본: sql/homepage/mariadb/select-last-reg-date.sql — 삭제건 필터 미적용(신선도 판단).
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Homepage 선제 이관 (2026-10-06).
SELECT COALESCE(TO_CHAR(MAX(reg_date), 'YYYY-MM-DD HH24:MI:SS'), '') AS "lastRegDate"
  FROM raw.raw_homepage_tbl_counsel
 WHERE category = 'COUNSELONLINE'
