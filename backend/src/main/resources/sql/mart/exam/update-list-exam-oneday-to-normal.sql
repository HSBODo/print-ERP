-- =========================================================
-- 원데이 소급 보정 UPDATE (매월 보정 배치용)
-- Profile: postgres-mart · Datasource: jdbcTemplate (Postgres, 마트)
--
-- MSSQL 조회(sql/softcrm/exam/select-onedays-with-later-reexam.sql) 결과
-- (chart_no, exam_date) 쌍 목록을 받아, Postgres list_exam.one_day='Y' 인 행만
-- 'N' 으로 되돌린다.
--
-- ⚠️ 매칭 키를 chart_no || '|' || exam_date 로 concat 해 IN 절에 넣는다 —
--    NamedParameterJdbcTemplate 은 tuple IN 을 안전하게 바인딩 못 하는데,
--    문자열 concat + text IN 은 안정적이다. 대량(수천 건) 이어도 Postgres 는
--    ANY-hash 로 O(N) 스캔에 문제 없음.
--
-- ⚠️ one_day='Y' 필터를 여기서 명시적으로 걸어야 이미 정상('N') 인 행이
--    조용히 '터치' 되지 않는다 (UPDATE 로그·트리거·복제 부담 방지).
-- =========================================================

-- RETURNING: 실제 뒤집힌 (chart_no, exam_date) 만 반환 —
--   candidates 로그(=MSSQL 후보 전체) 와 별개로 "무엇이 실제로 바뀌었는지" 를 잡을 유일한 창구.
--   UPDATE 뒤에는 list_exam 상 표식이 없어 사후 재구성 불가.
UPDATE list_exam
   SET one_day = 'N'
 WHERE one_day = 'Y'
   AND (chart_no || '|' || TO_CHAR(exam_date, 'YYYY-MM-DD')) IN (:pairKeys)
RETURNING chart_no, TO_CHAR(exam_date, 'YYYY-MM-DD') AS exam_date
