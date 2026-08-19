-- 고객분류별 검사수 월별 집계 — v_all_exam_list.motive_report 하나에서 뽑는다.
--
-- 종전에는 MSSQL 직결(find-exam-count-by-class-monthly.sql)로 EXAM+Cataract_Exam 세션에
-- MOTIVE_NEW02 OUTER APPLY(Idx='1', pkey DESC TOP 1) 로 motiveL 을 얹어 계산했다.
-- list_exam/list_cataract_exam 이 이미 동일 규칙(Idx='1' TOP 1)으로 motive_l 을 담고
-- v_all_exam_list 가 동일한 9계열 CASE (V34/V52) 를 파생하므로 그 뷰만 읽으면 된다.
--
-- 반환 shape 은 MSSQL 원본과 동일 — {month:int, motiveReport:String, cnt:int}.
-- ReportMartWriter.upsertExamCountByClass 가 이 shape 그대로 쓴다.
--
-- 배치가 채운 list_exam/list_cataract_exam(같은 도메인의 EXAM 이 먼저 실행됨) 을 읽으므로,
-- 배치 시점 이후 MSSQL 이 꺼져도 이 집계는 정상 재실행된다.
SELECT
    EXTRACT(MONTH FROM exam_date)::INTEGER AS "month",
    motive_report                          AS "motiveReport",
    COUNT(*)                               AS cnt
  FROM v_all_exam_list
 WHERE EXTRACT(YEAR FROM exam_date) = :year
 GROUP BY EXTRACT(MONTH FROM exam_date), motive_report
 ORDER BY 1, 2
