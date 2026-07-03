SELECT
    yr,
    mo,
    wk,
    partial,
    TO_CHAR(start_date, 'YYYY-MM-DD')   AS "startDate",
    TO_CHAR(end_date,   'YYYY-MM-DD')   AS "endDate",
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
  FROM mart_overall_exam_weekly
 WHERE yr IN (:years)
 ORDER BY yr, mo, wk
