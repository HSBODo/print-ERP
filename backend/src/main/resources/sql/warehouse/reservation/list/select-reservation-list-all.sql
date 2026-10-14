-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/reservation/list/select-reservation-list-all.sql
-- 이관 이력: 2026-09-30 A6 (ReservationMartJob 배치 read-side · list_reservation_all).
--
-- 방언 변환:
--   RESERVATION → raw.raw_crm_reservation
--   ISNULL → COALESCE
--   CONVERT(varchar(10), r.RESERVE_DATE, 23) → SUBSTRING(r.reserve_date FROM 1 FOR 10)
--     (raw.raw_crm_reservation.reserve_date 가 이미 varchar 라 안전 slice)
--   WITH(NOLOCK) → 제거
--
-- ⚠️ alias double-quote 필수 (Writer 가 row.get("reserveDate") case-sensitive).
--
-- 예약 전체 얇은 리스트 — mart_reservation_monthly(수술/외래/드림렌즈) 재집계용.
-- 원본 정의(sql/reservation/monthly-by-type.sql)의 SUM 대상 세 조건을 UNION 이 아닌
-- WHERE 로 담아 통째로 뽑는다. GROUP BY 는 마트 쪽(select-reservation-daily-agg.sql)에서.
--
--   surgery    = RESERVE_FLAG = 'O'
--   outpatient = RESERVE_JINRYO = '2'
--   dreamlens  = RESERVE_FLAG = 'D'
--   공통       = RESERVE_STATE <> 'C'  (취소 제외)
--
-- ⚠️ 테스트/무효 필터는 원본 monthly-by-type.sql 에 없어 여기도 넣지 않는다(정합 유지).
SELECT
    SUBSTRING(r.reserve_date FROM 1 FOR 10)   AS "reserveDate",
    COALESCE(r.reserve_flag, '')              AS "reserveFlag",
    COALESCE(r.reserve_jinryo, '')            AS "reserveJinryo",
    COALESCE(r.reserve_state, '')             AS "reserveState",
    COALESCE(LTRIM(RTRIM(r.cust_num)), '')    AS "chartNo",
    COALESCE(LTRIM(RTRIM(r.reserve_num)), '') AS "reserveNum"
FROM raw.raw_crm_reservation r
WHERE r.reserve_date >= :from
  AND r.reserve_date <= :to
  AND r.reserve_state <> 'C'
  AND ( r.reserve_flag = 'O' OR r.reserve_flag = 'D' OR r.reserve_jinryo = '2' )
