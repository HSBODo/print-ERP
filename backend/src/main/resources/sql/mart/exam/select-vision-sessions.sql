-- 시력교정 세션 리스트 — v_all_exam_list 에서 시력교정 그룹만.
--
-- 왜 필요한가.
--   주차 레포트의 시력교정 예약률·일반예약률·원데이 예약률은 세션별 booked(O 예약) 판정이 필요하다.
--   session count 는 리스트에서 나오지만 booked 는 배치 range 밖(미래) O 예약까지 봐야 하므로
--   MSSQL 브릿지(ConsultationRateBridgeRepository) 로 chart_no 별 O 예약 요약을 얻어 Java 에서 결합한다.
--   전환율·예약률 배치의 select-consultation-rate-vision-candidates.sql 과 같은 패턴.
--
-- 반환:
--   exam_date  DATE
--   chart_no   VARCHAR
--   exam_type  '원데이' | '일반'  (원데이 예약률·일반예약률 필터)
SELECT
    exam_date  AS "examDate",
    chart_no   AS "chartNo",
    exam_type  AS "examType"
  FROM v_all_exam_list
 WHERE exam_date >= CAST(:from AS DATE)
   AND exam_date <= CAST(:to   AS DATE)
   AND exam_group = '시력교정'
 ORDER BY exam_date, chart_no
