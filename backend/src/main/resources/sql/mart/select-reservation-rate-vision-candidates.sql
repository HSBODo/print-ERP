-- 시력교정 예약률 검사자 후보 — Postgres primary 리스트에서 검사자 세션만 뽑는다.
--
-- 원본(sql/exam/find-vision-reservation-rate-monthly.sql) 대비, 미래 예약 판정은 여기서 하지 않는다.
--   · '순수 외래 제외' 필터의 3개 EXISTS 중 M(검사) 예약만 리스트로 판정 가능.
--     - hasMReservation = list_reservation 에 exam_date 당일 I/H 예약이 있으면 1
--   · O 예약(FLAG='O', STATE<>'C', RESERVE_DATE>=exam_date) 존재 여부와
--     수술(OPERATION_DATE>=exam_date) 존재 여부는 MSSQL 브릿지에서 별도 조회 →
--     Java 에서 (max_o_any_date >= exam_date) OR (max_op_date >= exam_date) 로 판정.
--
-- 반환:
--   examDate         검사일 (DATE)
--   chartNo          고객번호
--   hasMReservation  검사일 당일 M(I/H) 예약 존재 여부 (0/1)
--
-- ⚠️ 이 결과는 examCount 계산 후보군이지 아직 필터 미적용. Java 에서 MSSQL 미래 데이터와 결합해야
--    실제 '순수 외래 제외' 판정과 surgeryBookedCount 가 나온다.
SELECT
    e.exam_date                                          AS "examDate",
    e.chart_no                                           AS "chartNo",
    CASE WHEN EXISTS (
        SELECT 1 FROM list_reservation lr
         WHERE lr.chart_no = e.chart_no
           AND CAST(NULLIF(lr.reserve_date, '') AS DATE) = e.exam_date
           AND lr.reserve_state IN ('I', 'H')
    ) THEN 1 ELSE 0 END                                  AS "hasMReservation"
  FROM v_all_exam_list e
 WHERE e.exam_date >= CAST(:from AS DATE)
   AND e.exam_date <= CAST(:to   AS DATE)
   AND e.exam_group = '시력교정'
 ORDER BY e.exam_date, e.chart_no
