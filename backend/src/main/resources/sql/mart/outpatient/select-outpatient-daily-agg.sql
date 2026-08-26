-- 외래수 일별 집계 — list_outpatient(= 외래수 리스트) 하나에서 뽑는다.
--
-- 월별 레포트·주차 레포트·외래수 화면이 **모두 이 결과를 합산**해서 쓴다.
-- 종전에는 같은 지표를 MSSQL 쪽 쿼리가 별도로 계산해 정의가 어긋날 위험이 있었다.
-- 검사·수술 도메인이 먼저 같은 패턴으로 이관됐고(2026-08), 외래수도 동일 방식.
--
-- 일(day) 단위로 주는 이유 — 월별은 월로, 주차는 ISO 주차로 각자 접으면 되고
-- 두 축이 같은 행에서 나오므로 서로 어긋날 수 없다.
--
-- ⚠️ 리스트가 있는 구간(2026-06~)만 값이 나온다. 2024·2025 와 2026-01~05 는
--    골든 시드가 우선이라 이 집계를 쓰지 않는다(OutpatientMartJob 의 시드 필터 참조).
--
-- 컬럼 뜻:
--   d      집계일 (reserve_date)
--   total  외래수 (리스트 행수 = RESERVE_FLAG='F' AND RESERVE_STATE IN ('I','H'))
SELECT
    reserve_date AS d,
    COUNT(*)     AS total
  FROM list_outpatient
 WHERE reserve_date >= CAST(:from AS DATE)
   AND reserve_date <= CAST(:to   AS DATE)
 GROUP BY reserve_date
 ORDER BY reserve_date
