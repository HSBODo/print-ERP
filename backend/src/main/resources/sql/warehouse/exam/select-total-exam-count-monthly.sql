-- 월별 검사수 (전체) · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/exam/select-total-exam-count-monthly.sql — 모집단 근거 그쪽 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            SELECT CAST(SUBSTRING(t.d FROM 1 FOR 4) AS INT) AS yr,
                   CAST(SUBSTRING(t.d FROM 6 FOR 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM (
__EXAM_SESSION_SOURCE__
            ) t
            GROUP BY CAST(SUBSTRING(t.d FROM 1 FOR 4) AS INT),
                     CAST(SUBSTRING(t.d FROM 6 FOR 2) AS INT)
            ORDER BY yr, mo
