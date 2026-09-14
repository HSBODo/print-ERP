SELECT
    yr,
    mo,
    recommend_x     AS "recommendX",
    lens_impossible AS "lensImpossible",
    keratoconus,
    avellino,
    glaucoma,
    vision_change   AS "visionChange",
    other,
    total
  FROM mart_stop_reason_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
