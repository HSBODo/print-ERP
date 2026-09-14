-- 백내장 상담성공률 검사자 후보 — v_all_exam_list 에서 (고객×월) 단위.
--
-- 원본(sql/softcrm/consultation/select-monthly-cataract-rates.sql) 대비 여기서 안 하는 것:
--   · booked = 백내장 O(JINRYO=4) 예약 유무 → MSSQL 브릿지 (Java 에서 max_o_cataract_date 존재로 판정)
-- 여기서 하는 것:
--   · stopped = cataract_class='중단' → 리스트로 판정 (한 달 안에 여러 검사일이면 MAX 로 임의 1)
--
-- 반환:
--   chartNo  고객번호
--   yr, mo   연-월
--   stopped  중단 여부 (0/1) — 그 (고객, 월) 그룹 중 하나라도 '중단' 이면 1
--
-- ⚠️ examCount 는 백내장 전체 (classification 백내장·중단·노안FU·기타 다 포함) DISTINCT 고객이라
--    여기서 exam_group='백내장' 만 필터하고 cataract_class 조건은 걸지 않는다.
--    (원본 정의: v_all_exam_list WHERE exam_group='백내장' - 4개 분류 전부)
--
-- ⚠️ 원본 대사(reconcile) 와의 정합 — 리스트는 실제 내원자만 (list_cataract_exam WHERE STATE NOT IN ('C','Y')).
--    원본 SQL(sql/softcrm/consultation/select-monthly-cataract-rates.sql) 은 예약 접수 기준으로 미내원(Y) 포함.
--    이 차이만큼 mart 가 원본보다 월 20~30명 적음. 리스트 정의가 상담성공률의 취지("실제 검사받은
--    사람의 상담 성공률")에 더 부합해 그대로 두기로 결정(2026-08-12).
SELECT
    e.chart_no                                 AS "chartNo",
    EXTRACT(YEAR  FROM e.exam_date)::int       AS "yr",
    EXTRACT(MONTH FROM e.exam_date)::int       AS "mo",
    MAX(CASE WHEN e.cataract_class = '중단' THEN 1 ELSE 0 END) AS "stopped"
  FROM v_all_exam_list e
 WHERE e.exam_date >= CAST(:from AS DATE)
   AND e.exam_date <= CAST(:to   AS DATE)
   AND e.exam_group = '백내장'
 GROUP BY e.chart_no,
          EXTRACT(YEAR  FROM e.exam_date),
          EXTRACT(MONTH FROM e.exam_date)
 ORDER BY "yr", "mo", e.chart_no
