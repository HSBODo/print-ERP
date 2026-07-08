SELECT
    yr,
    mo,
    surgery,
    outpatient,
    dreamlens,
    total
  FROM mart_reservation_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
