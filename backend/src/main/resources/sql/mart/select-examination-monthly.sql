SELECT
    yr,
    mo,
    vision_correction   AS "visionCorrection",
    dreamlens,
    cataract,
    exam_total          AS "examTotal",
    total
  FROM mart_examination_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
