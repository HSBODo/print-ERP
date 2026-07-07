SELECT
    yr,
    mo,
    partial,
    total_exam         AS "totalExam",
    intro_general      AS "introGeneral",
    intro_customer     AS "introCustomer",
    intro_staff        AS "introStaff",
    job_office         AS "jobOffice",
    job_student        AS "jobStudent",
    job_etc            AS "jobEtc",
    vision_booked      AS "visionBooked",
    cataract_total     AS "cataractTotal",
    cataract_only      AS "cataractOnly",
    cataract_booked    AS "cataractBooked",
    stop_count         AS "stopCount",
    vision_exam        AS "visionExam",
    dreamlens,
    one_day            AS "oneDay",
    one_day_booked     AS "oneDayBooked"
  FROM mart_overall_exam_monthly
 WHERE yr IN (:years)
 ORDER BY yr, mo
