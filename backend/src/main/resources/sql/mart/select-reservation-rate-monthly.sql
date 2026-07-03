SELECT
    yr,
    mo,
    exam_count            AS "examCount",
    surgery_booked_count  AS "surgeryBookedCount",
    reservation_rate      AS "reservationRate"
  FROM mart_reservation_rate_monthly
 WHERE yr IN (:years)
   AND category = :category
 ORDER BY yr, mo
