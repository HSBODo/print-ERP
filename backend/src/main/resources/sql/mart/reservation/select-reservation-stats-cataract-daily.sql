-- 백내장 일별 원시 카운트 조회 (Postgres 마트)
-- 최신 override 를 원본 위에 얹어 응답. override 없으면 원본 값 그대로.
-- override 는 (product_type='CATARACT', stat_date, field_name) 기준 created_at 최신 1건.
WITH latest_override AS (
    SELECT DISTINCT ON (stat_date, field_name)
        stat_date, field_name, override_value
    FROM reservation_stats_override
    WHERE product_type = 'CATARACT'
      AND stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
    ORDER BY stat_date, field_name, created_at DESC
),
overrides_pivoted AS (
    SELECT stat_date, jsonb_object_agg(field_name, override_value) AS ov
    FROM latest_override
    GROUP BY stat_date
)
SELECT
    TO_CHAR(d.stat_date, 'YYYY-MM-DD') AS date,
    COALESCE((o.ov->>'total_cataract')::int,               d.total_cataract)               AS total_cataract,
    COALESCE((o.ov->>'total_presbyopia')::int,             d.total_presbyopia)             AS total_presbyopia,
    COALESCE((o.ov->>'inbound_call')::int,                 d.inbound_call)                 AS inbound_call,
    COALESCE((o.ov->>'answered_call')::int,                d.answered_call)                AS answered_call,
    COALESCE((o.ov->>'new_exam_inquiry')::int,             d.new_exam_inquiry)             AS new_exam_inquiry,
    COALESCE((o.ov->>'new_re_inquiry')::int,               d.new_re_inquiry)               AS new_re_inquiry,
    COALESCE((o.ov->>'new_patient')::int,                  d.new_patient)                  AS new_patient,
    COALESCE((o.ov->>'tm_total_db')::int,                  d.tm_total_db)                  AS tm_total_db,
    COALESCE((o.ov->>'tm_valid_db')::int,                  d.tm_valid_db)                  AS tm_valid_db,
    COALESCE((o.ov->>'tm_reservation')::int,               d.tm_reservation)               AS tm_reservation,
    COALESCE((o.ov->>'kakao_total_inquiry')::int,          d.kakao_total_inquiry)          AS kakao_total_inquiry,
    COALESCE((o.ov->>'kakao_cataract_reservation')::int,   d.kakao_cataract_reservation)   AS kakao_cataract_reservation,
    COALESCE((o.ov->>'kakao_presbyopia_reservation')::int, d.kakao_presbyopia_reservation) AS kakao_presbyopia_reservation,
    COALESCE((o.ov->>'online_reservation')::int,           d.online_reservation)           AS online_reservation,
    COALESCE((o.ov->>'online_no_show')::int,               d.online_no_show)               AS online_no_show,
    COALESCE((o.ov->>'cancel_online')::int,                d.cancel_online)                AS cancel_online,
    COALESCE((o.ov->>'cancel_crm')::int,                   d.cancel_crm)                   AS cancel_crm,
    COALESCE((o.ov->>'cancel_kakao')::int,                 d.cancel_kakao)                 AS cancel_kakao,
    COALESCE((o.ov->>'visit')::int,                        d.visit)                        AS visit,
    COALESCE((o.ov->>'no_show_reservation')::int,          d.no_show_reservation)          AS no_show_reservation,
    COALESCE((o.ov->>'cancel')::int,                       d.cancel)                       AS cancel
FROM mart_reservation_stats_cataract_daily d
LEFT JOIN overrides_pivoted o ON o.stat_date = d.stat_date
WHERE d.stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
ORDER BY d.stat_date
