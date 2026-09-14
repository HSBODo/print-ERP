-- =========================================================
-- 원데이 소급 보정 후보 조회 (매월 보정 배치용)
-- Profile: postgres-mart · Datasource: statsJdbcTemplate (MSSQL, read-only)
--
-- 원본 로직 (사용자 개인 T-SQL 스크립트, 매월 실행하던 것):
--   UPDATE 검사마트 SET 원데이구분 = '일반'
--   WHERE 검사일 BETWEEN @from AND @to
--     AND 원데이구분 = '원데이'
--     AND EXISTS (재검사 예약이 검사일 이후 등록됨)
--
-- 프로젝트는 Postgres 마트라 여기서는 UPDATE 못 한다. MSSQL 은 SELECT 로
-- 후보 쌍(chart_no, exam_date) 만 뽑고, Postgres list_exam.one_day='Y' 필터는
-- 실제 UPDATE 쪽 (sql/mart/exam/update-list-exam-oneday-to-normal.sql) 에서 걸린다.
--
-- ⚠️ 원본 SQL 의 원데이 판정('원데이구분 = '원데이'') 은 여기서 안 건다.
--    이유는 EXAM 원본에는 원데이구분이 없고 select-exam-list.sql 의 CASE 로
--    계산되며, Postgres list_exam 에 결과가 이미 있다. UPDATE 조건에서 걸면
--    같은 규칙이 두 벌이 되는 걸 피할 수 있다.
--
-- 재검사 판정: RESERVE_FLAG = 'M' (검사예약) · RESERVE_JINRYO = '2' (재검사).
-- 취소 여부는 무관 (원본 SQL 취지 그대로) — 등록되었다는 사실 자체가 원데이 판정 뒤집는 신호.
-- =========================================================

-- 프로젝트 관례: CUSTOM.CUST_NUM 이 chartNo 로 쓰인다(CUSTOM.CHART_NUM 컬럼 없음).
-- EXAM.CUST_NUM 을 그대로 chartNo 로 사용하면 CUSTOM 조인 자체가 불필요.
-- 참고: sql/softcrm/exam/select-exam-list.sql:2 (LTRIM(RTRIM(cu.CUST_NUM)) AS chartNo)
SELECT DISTINCT
       ISNULL(LTRIM(RTRIM(e.CUST_NUM)), '')         AS chartNo,
       CONVERT(varchar(10), e.EXAM_DATE, 23)        AS examDate
FROM   EXAM e WITH(NOLOCK)
WHERE  e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
  AND  EXISTS (
         SELECT 1
         FROM   RESERVATION r WITH(NOLOCK)
         WHERE  r.CUST_NUM       = e.CUST_NUM
           AND  r.RESERVE_FLAG   = 'M'
           AND  r.RESERVE_JINRYO = '2'
           AND  r.RESERVE_DATE   > e.EXAM_DATE
       );
