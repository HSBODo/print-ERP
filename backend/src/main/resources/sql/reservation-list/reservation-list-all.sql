-- 예약 전체 얇은 리스트 — mart_reservation_monthly(수술/외래/드림렌즈) 재집계용.
--
-- 원본 정의(sql/reservation/monthly-by-type.sql)의 SUM 대상 세 조건을 UNION 이 아닌
-- WHERE 로 담아 통째로 뽑는다. GROUP BY 는 마트 쪽(select-reservation-daily-agg.sql)에서.
--
--   surgery    = RESERVE_FLAG = 'O'
--   outpatient = RESERVE_JINRYO = '2'
--   dreamlens  = RESERVE_FLAG = 'D'
--   공통       = RESERVE_STATE <> 'C'  (취소 제외)
--
-- ⚠️ 테스트/무효 필터는 원본 monthly-by-type.sql 에 없어 여기도 넣지 않는다(정합 유지).
--    새 필터가 필요하면 두 곳(monthly-by-type · 이 파일)을 함께 고쳐 대사가 계속 맞게 한다.
SELECT
    CONVERT(varchar(10), r.RESERVE_DATE, 23)   AS reserveDate,
    ISNULL(r.RESERVE_FLAG, '')                 AS reserveFlag,
    ISNULL(r.RESERVE_JINRYO, '')               AS reserveJinryo,
    ISNULL(r.RESERVE_STATE, '')                AS reserveState,
    ISNULL(LTRIM(RTRIM(r.CUST_NUM)), '')       AS chartNo,
    ISNULL(LTRIM(RTRIM(r.RESERVE_NUM)), '')    AS reserveNum
FROM RESERVATION r WITH(NOLOCK)
WHERE r.RESERVE_DATE >= :from
  AND r.RESERVE_DATE <= :to
  AND r.RESERVE_STATE <> 'C'
  AND ( r.RESERVE_FLAG = 'O' OR r.RESERVE_FLAG = 'D' OR r.RESERVE_JINRYO = '2' )
