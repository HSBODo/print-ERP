SELECT
    TO_CHAR(registered_at, 'YYYY-MM-DD')      AS "registeredAt",
    COALESCE(registered_time, '')              AS "registeredTime",
    COALESCE(reserve_date, '')                 AS "reserveDate",
    COALESCE(reserve_time, '')                 AS "reserveTime",
    COALESCE(chart_no, '')                     AS "chartNo",
    COALESCE(name, '')                         AS "name",
    COALESCE(reserve_state, '')                AS "reserveState",
    COALESCE(channel, '')                      AS "channel",
    COALESCE(channel_group, '')                AS "channelGroup",
    COALESCE(doctor, '')                       AS "doctor",
    COALESCE(counselor, '')                    AS "counselor",
    COALESCE(comment, '')                      AS "comment",
    COALESCE(motive_l, '')                     AS "motiveL",
    COALESCE(motive_m, '')                     AS "motiveM",
    COALESCE(motive_m_source, '')              AS "motiveMSource",
    COALESCE(exam_reg_date, '')                AS "examRegDate",
    COALESCE(exam_stop, '')                    AS "examStop",
    COALESCE(surgery_reg_date, '')             AS "surgeryRegDate",
    COALESCE(surgery_r, '')                    AS "surgeryR",
    COALESCE(surgery_l, '')                    AS "surgeryL"
  FROM list_reservation
 WHERE registered_at >= CAST(:from AS DATE)
   AND registered_at <= CAST(:to   AS DATE)
 ORDER BY registered_at, id
