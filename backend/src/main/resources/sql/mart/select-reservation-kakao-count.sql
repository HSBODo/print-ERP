SELECT COALESCE(SUM(kakao_count), 0)
  FROM mart_reservation_kakao_daily
 WHERE dt >= CAST(:from AS DATE)
   AND dt <= CAST(:to   AS DATE)
