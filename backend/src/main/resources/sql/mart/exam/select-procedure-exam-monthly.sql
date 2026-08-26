SELECT
    yr,
    mo,
    exam_count          AS "examCount",
    one_day_exam_count  AS "oneDayExamCount",
    total
  FROM mart_procedure_exam_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
