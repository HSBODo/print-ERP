-- 예약 건수 일별 집계 — list_reservation_all(= 예약 전체 얇은 리스트) 하나에서 뽑는다.
--
-- 월별 레포트·예약 화면이 **이 결과를 합산**해서 쓴다.
-- 종전에는 같은 지표를 MSSQL 쪽 쿼리(monthly-by-type.sql)가 계산해
-- 정의가 어긋날 위험이 있었다. 외래수·중단사유와 같은 리스트→마트 재집계 패턴.
--
-- 일(day) 단위로 주는 이유 — 월별은 월로, 주차는 ISO 주차로 각자 접으면 되고
-- 두 축이 같은 행에서 나오므로 서로 어긋날 수 없다.
--
-- ⚠️ 리스트가 있는 구간만 값이 나온다. 24·25 는 원본 정의 그대로 계산돼 마트에 저장된다
--    (mart_reservation_monthly 는 골든시드 없음 — min-year 필터 대상 아님).
--
-- 컬럼 뜻 (버킷 정의는 sql/softcrm/reservation/select-monthly-by-type.sql 과 동일):
--   surgery    수술 예약    RESERVE_FLAG = 'O'
--   outpatient 외래 예약    RESERVE_JINRYO = '2'
--   dreamlens  드림렌즈     RESERVE_FLAG = 'D'
--   공통       RESERVE_STATE <> 'C' (원천 SQL 에서 이미 필터)
SELECT
    reserve_date AS d,
    COUNT(*) FILTER (WHERE reserve_flag = 'O')     AS surgery,
    COUNT(*) FILTER (WHERE reserve_jinryo = '2')   AS outpatient,
    COUNT(*) FILTER (WHERE reserve_flag = 'D')     AS dreamlens
  FROM list_reservation_all
 WHERE reserve_date >= CAST(:from AS DATE)
   AND reserve_date <= CAST(:to   AS DATE)
 GROUP BY reserve_date
 ORDER BY reserve_date
