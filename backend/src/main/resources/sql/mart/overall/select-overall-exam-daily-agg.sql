-- 검사자 종합지표 일별 집계 — v_all_exam_list(V56 확장) 한 뷰에서 뽑는다.
--
-- 종전에는 MSSQL 6종 SQL (sql/softcrm/overall/select-{demographics,vision,cataract,dreamlens,stop-count,one-day}-daily.sql)
-- 을 배치가 각각 조회했다. v_all_exam_list 가 이미 검사구분·원데이·유입·직업·백내장분류·
-- 수술예약(V56) 파생 컬럼을 다 담고 있어 한 번 스캔으로 모두 계산할 수 있다.
--
-- OverallExamListAggregator 가 이 결과를 주(월~일, 월 경계 클립)로 버킷팅하고,
-- 월별은 그 주별을 (yr, mo) 로 롤업한다 — 자바 로직은 종전 OverallExamWeeklyService 와 동일.
--
-- ⚠️ 소스가 list 스냅샷이므로 배치 시점 이후 새로 생긴 O 예약은 다음 재적재 때 반영됨(gap).
--    "미래 예약 실시간 판정" 이 필수인 다른 마트(consultation-rate 등) 는 별도 브릿지 유지.
--
-- 컬럼 뜻 (자바 필드명과 1:1):
--   popTotal          총검사자 (list_exam + list_cataract_exam 전체)
--   cataractSessions  백내장 전체 (노안·FU·기타 포함 · 리스트의 백내장 갈래 전체)
--   jobOffice/Student/Etc     job_bucket 분류
--   introGeneral/Customer/Staff  intro_type 분류
--   visionExam        시력교정 검사수
--   visionBooked      시력교정 검사자 중 O 예약 존재
--   cataractOnly      백내장(추천 눈 수) — 활성 백내장 세션(cataract_class IN 백내장/중단)의 눈 수 합
--   cataractBooked    활성 백내장 세션 중 O 예약 존재 (사람 단위)
--   dreamlens         드림렌즈 검사수
--   stopCount         시력교정 중단수 (stop_yn='Y')
--   oneDay            원데이 검사수 (시력교정+백내장 합)
--   oneDayBooked      원데이 중 O 예약 존재
SELECT
    exam_date                                                                     AS d,
    COUNT(*)                                                                      AS "popTotal",
    COUNT(*) FILTER (WHERE exam_group = '백내장')                                  AS "cataractSessions",
    COUNT(*) FILTER (WHERE job_bucket = '직장인')                                   AS "jobOffice",
    COUNT(*) FILTER (WHERE job_bucket = '학생')                                     AS "jobStudent",
    COUNT(*) FILTER (WHERE job_bucket = '기타')                                     AS "jobEtc",
    COUNT(*) FILTER (WHERE intro_type = '일반')                                    AS "introGeneral",
    COUNT(*) FILTER (WHERE intro_type = '고객소개')                                 AS "introCustomer",
    COUNT(*) FILTER (WHERE intro_type = '직원소개')                                 AS "introStaff",
    COUNT(*) FILTER (WHERE exam_group = '시력교정')                                AS "visionExam",
    COUNT(*) FILTER (WHERE exam_group = '시력교정' AND surgery_reserve_date <> '') AS "visionBooked",
    -- 백내장 눈 수 (활성 세션만): 중단 · 노안/FU · 기타 제외, 백내장 검사수(mart_examination_monthly.cataract_exam) 정의와 정합
    COALESCE(SUM(cataract_eye_count) FILTER (WHERE exam_group = '백내장'
                                              AND cataract_class IN ('백내장', '중단')), 0) AS "cataractOnly",
    COUNT(*) FILTER (WHERE exam_group = '백내장'
                      AND cataract_class IN ('백내장', '중단')
                      AND cataract_eye_count > 0
                      AND surgery_reserve_date <> '')                              AS "cataractBooked",
    COUNT(*) FILTER (WHERE exam_group = '드림렌즈')                                 AS "dreamlens",
    COUNT(*) FILTER (WHERE exam_group = '시력교정' AND stop_yn = 'Y')              AS "stopCount",
    COUNT(*) FILTER (WHERE exam_type = '원데이')                                   AS "oneDay",
    COUNT(*) FILTER (WHERE exam_type = '원데이' AND surgery_reserve_date <> '')    AS "oneDayBooked"
  FROM v_all_exam_list
 WHERE exam_date >= CAST(:from AS DATE)
   AND exam_date <= CAST(:to   AS DATE)
 GROUP BY exam_date
 ORDER BY exam_date
