-- 검사수 범위 집계 — 마트 원시 COUNT (필터·세션합 없음). [postgres-mart]
-- 2026-07-15 브랜치의 find-exam-count-range.sql 로직을 마트로 옮긴 것과 동치:
--   visionCount    = list_exam         행수 (= MSSQL EXAM 행수)
--   cataractCount  = list_cataract_exam 행수 (= 사람·검사일 수, MSSQL Cataract_Exam 세션수와는 다름)
-- 조회건수(사람) 옆 참고 지표. 필터·세션수 반영이 필요하면 SQL 을 확장할 것.
SELECT
    (SELECT COUNT(*) FROM list_exam
       WHERE exam_date >= CAST(:from AS DATE)
         AND exam_date <= CAST(:to   AS DATE))::INTEGER AS "visionCount",
    (SELECT COUNT(*) FROM list_cataract_exam
       WHERE exam_date >= CAST(:from AS DATE)
         AND exam_date <= CAST(:to   AS DATE))::INTEGER AS "cataractCount"
