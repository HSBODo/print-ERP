            -- 중단수 일별 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/overall/select-stop-count-daily.sql.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            SELECT e.exam_date AS d, COUNT(*) AS cnt
            FROM raw.raw_crm_exam e
            WHERE e.exam_date >= :from AND e.exam_date <= :to
              AND COALESCE(e.stop_yn, '') = 'Y'
            GROUP BY e.exam_date
            ORDER BY e.exam_date
