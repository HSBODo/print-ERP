SELECT
    yr,
    mo,
    reservations,
    online,
    call_count AS "call",
    total
  FROM mart_reservation_overall_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
