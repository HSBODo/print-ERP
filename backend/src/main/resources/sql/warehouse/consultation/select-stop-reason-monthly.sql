-- 검사 중단 사유 월별 집계 · Postgres · 웨어하우스 라우팅.
-- MSSQL 정본: sql/softcrm/consultation/select-stop-reason-monthly.sql — 코드 매핑·그룹·함정 전부 그쪽 헤더/주석 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · RECONCILE wave (2026-10-06).
-- ReservationReconcileService 가 아닌 ConsultationReconcileService 전용(파이프라인 밖). exam_date varchar(YYYY-MM-DD).
            SELECT t.yr, t.mo,
                   SUM(CASE WHEN t.cat = 'recommendX'     THEN 1 ELSE 0 END) AS "recommendX",
                   SUM(CASE WHEN t.cat = 'lensImpossible' THEN 1 ELSE 0 END) AS "lensImpossible",
                   SUM(CASE WHEN t.cat = 'keratoconus'    THEN 1 ELSE 0 END) AS "keratoconus",
                   SUM(CASE WHEN t.cat = 'avellino'       THEN 1 ELSE 0 END) AS "avellino",
                   SUM(CASE WHEN t.cat = 'glaucoma'       THEN 1 ELSE 0 END) AS "glaucoma",
                   SUM(CASE WHEN t.cat = 'visionChange'   THEN 1 ELSE 0 END) AS "visionChange",
                   SUM(CASE WHEN t.cat = 'other'          THEN 1 ELSE 0 END) AS "other"
            FROM (
                SELECT CAST(SUBSTRING(e.exam_date FROM 1 FOR 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.exam_date FROM 6 FOR 2) AS INT) AS mo,
                       CASE TRIM(COALESCE(e.cancel_cd, ''))
                           WHEN '121' THEN 'recommendX'
                           WHEN '305' THEN 'recommendX'
                           WHEN '122' THEN 'lensImpossible'
                           WHEN '306' THEN 'lensImpossible'
                           WHEN '399' THEN 'lensImpossible'
                           WHEN '124' THEN 'keratoconus'
                           WHEN '125' THEN 'keratoconus'
                           WHEN '308' THEN 'keratoconus'
                           WHEN '309' THEN 'keratoconus'
                           WHEN '126' THEN 'avellino'
                           WHEN '310' THEN 'avellino'
                           WHEN '114' THEN 'glaucoma'
                           WHEN '303' THEN 'glaucoma'
                           WHEN '111' THEN 'visionChange'
                           WHEN '302' THEN 'visionChange'
                           -- 아래 4개는 '불가_' 코드지만 검토 결과 기타(잠정 중단)로 귀속 결정(2026-07-15).
                           WHEN '117' THEN 'other'   -- 불가_백내장FU
                           WHEN '304' THEN 'other'   -- 불가_백내장FU (3xx 짝)
                           WHEN '127' THEN 'other'   -- 불가_기타 각막병증
                           WHEN '311' THEN 'other'   -- 불가_기타 각막병증 (3xx 짝)
                           ELSE 'other'
                       END AS cat
                FROM raw.raw_crm_exam e
                WHERE e.stop_yn = 'Y'
                  AND e.exam_date >= :from AND e.exam_date <= :to
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
