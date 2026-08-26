SELECT
    yr,
    mo,
    vision_exam_count           AS "visionExamCount",
    vision_counsel_count        AS "visionCounselCount",
    vision_surgery_booked       AS "visionSurgeryBooked",
    vision_actual_surgery       AS "visionActualSurgery",
    vision_surgery_rate         AS "visionSurgeryRate",
    vision_counsel_rate         AS "visionCounselRate",
    vision_counsel_rate_oneday  AS "visionCounselRateOneday",
    vision_counsel_rate_general AS "visionCounselRateGeneral",
    vision_general_book_rate    AS "visionGeneralBookRate",
    cataract_exam_count         AS "cataractExamCount",
    cataract_surgery_booked     AS "cataractSurgeryBooked",
    cataract_stopped_count      AS "cataractStoppedCount",
    cataract_surgery_rate       AS "cataractSurgeryRate"
  FROM mart_consultation_rate_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
