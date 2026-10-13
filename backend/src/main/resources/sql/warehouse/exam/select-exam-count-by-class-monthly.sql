            -- 고객분류별 검사수 월간 집계 · Postgres · 웨어하우스 라우팅.
            -- MSSQL 정본: sql/softcrm/exam/select-exam-count-by-class-monthly.sql — 분류 규칙 그쪽 참고.
            -- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE Fragment 블록 (2026-10-06).
            -- exam_date varchar(YYYY-MM-DD).
            WITH sess AS (
__EXAM_SESSION_SOURCE__
            ),
            classified AS (
                SELECT
                    CAST(SUBSTRING(s.d FROM 6 FOR 2) AS INT) AS mon,
                    CASE WHEN COALESCE(mv.motiveL, '') = 'B2B(군인)' THEN 'B2B(군인)'
                         WHEN COALESCE(mv.motiveL, '') IN ('B2B(기업)', 'B2B(비앤빛)', 'B2B(백내장)', '제휴') THEN 'B2B(기업)'
                         WHEN COALESCE(mv.motiveL, '') IN ('소개고객', '소개미확인', 'VIP고객관리팀') THEN '소개고객'
                         WHEN COALESCE(mv.motiveL, '') IN ('소개직원', '광고', '바이럴', '프로모션', '홈페이지') THEN mv.motiveL
                         ELSE '기타' END AS "motiveReport"
                FROM sess s
                LEFT JOIN LATERAL (
                    SELECT COALESCE(m2.category01_name, '') AS motiveL
                    FROM raw.raw_crm_motive_new02 m2
                    -- ⚠️ TRIM 양쪽: motive_new02(23) vs fragment s.cn(exam/custom 13).
                    -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #3
                    WHERE TRIM(m2.cust_num) = TRIM(s.cn) AND m2.idx = '1'
                    ORDER BY m2.pkey DESC
                    LIMIT 1
                ) mv ON true
            )
            SELECT mon AS month, "motiveReport", COUNT(*) AS cnt
            FROM classified
            GROUP BY mon, "motiveReport"
            ORDER BY mon, "motiveReport"
