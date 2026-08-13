-- 시력교정 상담성공률 검사자 후보 — Postgres primary 리스트(list_exam)에서 세션 단위.
--
-- 원본(sql/consultation/find-monthly-vision-rates.sql) 대비, MSSQL 미래 데이터가 필요한 부분은 여기서 안 함:
--   · counsel  = STOP_YN<>'Y' AND OP 추천(recommended_r/l) 있음  → 리스트에서 판정 가능 (여기서 판정)
--   · od       = list_exam.one_day = 'Y'                          → 리스트로 판정 가능 (여기서)
--   · booked   = 그 사람이 O 예약 있음(전 기간, state<>'C')         → MSSQL 브릿지 (Java 에서)
--   · actual   = 그 사람이 수술 기록 있음                          → MSSQL 브릿지 (Java 에서)
--
-- 반환:
--   examDate  검사일
--   chartNo   고객번호
--   counsel   OP 추천 후 상담 여부 (0/1)
--   od        원데이 여부 (0/1) — list_exam.one_day (같은날 M/5 예약 존재 판정 기반)
--
-- ⚠️ v_all_exam_list 가 아닌 list_exam 직접 조회 — recommended_r/l·cancel_code 컬럼이
--    뷰에 노출되지 않기 때문(V52 뷰 SELECT 참조). 백내장 검사자 제외는 list_exam WHERE 에 이미 반영됨.
SELECT
    e.exam_date  AS "examDate",
    e.chart_no   AS "chartNo",
    CASE
        WHEN COALESCE(e.exam_stop, '') <> 'Y'
         AND (COALESCE(NULLIF(TRIM(e.recommended_r), ''), '') <> ''
           OR COALESCE(NULLIF(TRIM(e.recommended_l), ''), '') <> '')
        THEN 1 ELSE 0
    END          AS "counsel",
    CASE WHEN e.one_day = 'Y' THEN 1 ELSE 0 END AS "od"
  FROM list_exam e
 WHERE e.exam_date >= CAST(:from AS DATE)
   AND e.exam_date <= CAST(:to   AS DATE)
   AND COALESCE(e.cancel_code, '') = ''
 ORDER BY e.exam_date, e.chart_no
