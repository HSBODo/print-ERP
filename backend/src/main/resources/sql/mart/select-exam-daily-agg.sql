-- 검사 일별 집계 — v_all_exam_list(= 전체 검사자 리스트) 하나에서 뽑는다.
--
-- 월별 레포트·주차 레포트·검사수 화면이 **모두 이 결과를 합산**해서 쓴다.
-- 종전에는 같은 지표를 MSSQL 쪽 쿼리 여러 개가 각자 구현해서, 정의가 바뀌면
-- 여러 곳을 고쳐야 했고 하나 빠뜨리면 조용히 어긋났다(2026-08-05 원데이 3건).
--
-- 일(day) 단위로 주는 이유 — 월별은 월로, 주차는 ISO 주차로 각자 접으면 되고
-- 두 축이 같은 행에서 나오므로 서로 어긋날 수 없다.
--
-- ⚠️ 리스트가 있는 구간(2026-01~)만 값이 나온다. 2024·2025 와 2026-01~05 레포트는
--    골든 시드가 우선이라 이 집계를 쓰지 않는다(ExamMartJob 의 시드 필터 참조).
--
-- 컬럼 뜻:
--   total         전체 검사수 (리스트 행수)
--   vision/dreamlens/cataract_all   검사구분별 (백내장은 모집단 전체 = 102)
--   cataract_exam 백내장 '검사수' — 분류 백내장+중단만 (= 56). cataract_all 과 다르다.
--   one_day/general  원데이+일반 = total 이 성립한다
SELECT
    exam_date                                                            AS d,
    COUNT(*)                                                             AS total,
    COUNT(*) FILTER (WHERE exam_group = '시력교정')                       AS vision,
    COUNT(*) FILTER (WHERE exam_group = '드림렌즈')                       AS dreamlens,
    COUNT(*) FILTER (WHERE exam_group = '백내장')                         AS cataract_all,
    COUNT(*) FILTER (WHERE cataract_class IN ('백내장', '중단'))           AS cataract_exam,
    COUNT(*) FILTER (WHERE exam_type = '원데이')                          AS one_day,
    COUNT(*) FILTER (WHERE exam_type = '일반')                            AS general,
    COUNT(*) FILTER (WHERE intro_type = '일반')                           AS intro_general,
    COUNT(*) FILTER (WHERE intro_type = '고객소개')                        AS intro_customer,
    COUNT(*) FILTER (WHERE intro_type = '직원소개')                        AS intro_staff,
    COUNT(*) FILTER (WHERE job_bucket = '직장인')                          AS job_office,
    COUNT(*) FILTER (WHERE job_bucket = '학생')                            AS job_student,
    COUNT(*) FILTER (WHERE job_bucket = '기타')                            AS job_etc
  FROM v_all_exam_list
 WHERE exam_date >= CAST(:from AS DATE)
   AND exam_date <= CAST(:to   AS DATE)
 GROUP BY exam_date
 ORDER BY exam_date
