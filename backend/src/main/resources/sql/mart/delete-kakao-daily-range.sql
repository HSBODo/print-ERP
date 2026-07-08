DELETE FROM mart_reservation_kakao_daily
WHERE dt >= CAST(:from AS DATE)
  AND dt <= CAST(:to   AS DATE)
