SELECT
    yr,
    mo,
    outpatient_count  AS "outpatientCount",
    total
  FROM mart_outpatient_count_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
