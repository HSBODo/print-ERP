-- 백내장 예약률 검사자 후보 — Postgres primary 리스트에서 (고객×월) 단위로 뽑는다.
--
-- 원본(sql/softcrm/exam/select-cataract-reservation-rate-monthly.sql) 대비, 미래 예약 판정은 여기서 하지 않는다.
--   · 검사자 모집단(v_all_exam_list, exam_group='백내장' AND cataract_class IN ('백내장','중단')) 만 담당.
--   · 백내장 O 예약(FLAG='O', JINRYO='4', STATE<>'C', RESERVE_DATE>=first_exam_date) 은
--     MSSQL 브릿지가 chart_no 별 max_o_cataract_date 를 넘겨주면 Java 에서 비교.
--
-- 반환:
--   chartNo         고객번호
--   yr, mo          연-월 (검사일 기준)
--   firstExamDate   그 (고객, 월) 그룹의 첫 검사일 (Java에서 max_o_cataract_date>=firstExamDate 판정용)
--
-- ⚠️ 집계 단위 = 고객 × 월 (원본 GROUP BY CUST_NUM, ym 과 동일). 같은 달에 두 번 내원해도 1명.
SELECT
    e.chart_no                            AS "chartNo",
    EXTRACT(YEAR  FROM e.exam_date)::int  AS "yr",
    EXTRACT(MONTH FROM e.exam_date)::int  AS "mo",
    MIN(e.exam_date)                      AS "firstExamDate"
  FROM v_all_exam_list e
 WHERE e.exam_date >= CAST(:from AS DATE)
   AND e.exam_date <= CAST(:to   AS DATE)
   AND e.exam_group     = '백내장'
   AND e.cataract_class IN ('백내장', '중단')
 GROUP BY e.chart_no,
          EXTRACT(YEAR  FROM e.exam_date),
          EXTRACT(MONTH FROM e.exam_date)
 ORDER BY "yr", "mo", e.chart_no
