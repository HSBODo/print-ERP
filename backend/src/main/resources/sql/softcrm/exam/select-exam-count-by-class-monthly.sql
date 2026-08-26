            -- 고객분류별 검사수(월간 레포트 도표 #7) — 한 해의 (월 × 내원동기(레포트)) 집계.
            -- 모집단은 sql/softcrm/fragments/fragment-exam-session-source.sql 공유 — select-total-exam-count-monthly.sql 과 같아서
            --   월별 합계가 '검사수' 도표와 정확히 맞고, 검사자 리스트(all-exam-list)와도 1:1 정합한다.
            --   (2026-08-04 이전에는 `EXAM 전부 + Cataract_Exam 전부` 라 리스트와 어긋났다)
            -- 분류 규칙은 select-all-exam-list.sql · select-all-exam-list.sql 의 motiveReport 와 동일해야
            --   리스트·레포트가 어긋나지 않는다. (규칙을 고칠 일이 있으면 세 파일을 함께 고칠 것)
            -- EXAM_DATE 는 'YYYY-MM-DD' 문자열이라 SUBSTRING 으로 월을 자른다.
            WITH sess AS (
__EXAM_SESSION_SOURCE__
            ),
            classified AS (
                SELECT
                    CAST(SUBSTRING(s.d, 6, 2) AS INT) AS mon,
                    CASE WHEN ISNULL(mv.motiveL, '') = N'B2B(군인)' THEN N'B2B(군인)'
                         WHEN ISNULL(mv.motiveL, '') IN (N'B2B(기업)', N'B2B(비앤빛)', N'B2B(백내장)', N'제휴') THEN N'B2B(기업)'
                         WHEN ISNULL(mv.motiveL, '') IN (N'소개고객', N'소개미확인', N'VIP고객관리팀') THEN N'소개고객'
                         WHEN ISNULL(mv.motiveL, '') IN (N'소개직원', N'광고', N'바이럴', N'프로모션', N'홈페이지') THEN mv.motiveL
                         ELSE N'기타' END AS motiveReport
                FROM sess s
                OUTER APPLY (
                    SELECT TOP 1 ISNULL(m2.category01_name, '') AS motiveL
                    FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
                    WHERE m2.cust_num = s.cn AND m2.Idx = '1'
                    ORDER BY m2.pkey DESC
                ) mv
            )
            SELECT mon AS month, motiveReport, COUNT(*) AS cnt
            FROM classified
            GROUP BY mon, motiveReport
            ORDER BY mon, motiveReport
