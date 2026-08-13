-- 백내장 세션 리스트 — v_all_exam_list 에서 백내장 모집단(백내장·중단 분류).
--
-- 왜 필요한가.
--   주차 레포트 백내장 예약률을 **사람 단위**로 통일한다(눈 단위 → 사람 단위).
--   배치의 mart_reservation_rate_monthly[cataract] · 담당자 확정 골든값(V27) 이 모두 사람 단위 —
--   주차만 눈 단위였던 걸 맞춘다.
--
--   집계 단위 = (chart_no × ISO 주). Java 에서 주로 접으며, 그 주의 min(exam_date) 를 firstExamDate 로
--   삼아 브릿지의 max_o_cataract_date >= firstExamDate 로 booked 판정. 배치의 월별 정의(chart_no × 월)와
--   같은 규칙을 주로 바꾼 것.
--
-- 반환:
--   exam_date  DATE
--   chart_no   VARCHAR
SELECT
    exam_date  AS "examDate",
    chart_no   AS "chartNo"
  FROM v_all_exam_list
 WHERE exam_date >= CAST(:from AS DATE)
   AND exam_date <= CAST(:to   AS DATE)
   AND exam_group     = '백내장'
   AND cataract_class IN ('백내장', '중단')
 ORDER BY exam_date, chart_no
