-- 고객분류별 검사수 — 한 해의 (월 × 내원동기(레포트)) 건수.
-- MSSQL 직결(find-exam-count-by-class-monthly.sql)과 같은 shape 로 내려준다.
SELECT
    mo            AS "month",
    motive_report AS "motiveReport",
    cnt
  FROM mart_exam_count_by_class
 WHERE yr = :year
 ORDER BY mo, motive_report
