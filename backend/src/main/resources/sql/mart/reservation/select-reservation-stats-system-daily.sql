-- 시력교정 일별 원시 카운트 조회 (Postgres 마트)
-- 최신 override 를 원본 위에 얹어 응답. override 없으면 원본 값 그대로.
-- override 는 (product_type='SYSTEM', stat_date, field_name) 기준 created_at 최신 1건.
WITH latest_override AS (
    SELECT DISTINCT ON (stat_date, field_name)
        stat_date, field_name, override_value
    FROM reservation_stats_override
    WHERE product_type = 'SYSTEM'
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
    COALESCE((o.ov->>'inbound_call')::int,               d.inbound_call)               AS inbound_call,
    COALESCE((o.ov->>'answered_call')::int,              d.answered_call)              AS answered_call,
    COALESCE((o.ov->>'new_inquiry')::int,                d.new_inquiry)                AS new_inquiry,
    COALESCE((o.ov->>'call_reservation')::int,           d.call_reservation)           AS call_reservation,
    COALESCE((o.ov->>'tm_total_db')::int,                d.tm_total_db)                AS tm_total_db,
    COALESCE((o.ov->>'tm_valid_db')::int,                d.tm_valid_db)                AS tm_valid_db,
    COALESCE((o.ov->>'tm_reservation')::int,             d.tm_reservation)             AS tm_reservation,
    COALESCE((o.ov->>'tm_recounsel')::int,               d.tm_recounsel)               AS tm_recounsel,
    COALESCE((o.ov->>'tm_recounsel_valid')::int,         d.tm_recounsel_valid)         AS tm_recounsel_valid,
    COALESCE((o.ov->>'tm_recounsel_reservation')::int,   d.tm_recounsel_reservation)   AS tm_recounsel_reservation,
    COALESCE((o.ov->>'home_received')::int,              d.home_received)              AS home_received,
    COALESCE((o.ov->>'home_reservation')::int,           d.home_reservation)           AS home_reservation,
    COALESCE((o.ov->>'naver_received')::int,             d.naver_received)             AS naver_received,
    COALESCE((o.ov->>'naver_rejected')::int,             d.naver_rejected)             AS naver_rejected,
    COALESCE((o.ov->>'naver_valid')::int,                d.naver_valid)                AS naver_valid,
    COALESCE((o.ov->>'naver_reservation')::int,          d.naver_reservation)          AS naver_reservation,
    COALESCE((o.ov->>'kakao_inquiry')::int,              d.kakao_inquiry)              AS kakao_inquiry,
    COALESCE((o.ov->>'kakao_reservation')::int,          d.kakao_reservation)          AS kakao_reservation,
    COALESCE((o.ov->>'cancel_call_naver')::int,          d.cancel_call_naver)          AS cancel_call_naver,
    COALESCE((o.ov->>'cancel_home')::int,                d.cancel_home)                AS cancel_home,
    COALESCE((o.ov->>'cancel_kakao')::int,               d.cancel_kakao)               AS cancel_kakao,
    COALESCE((o.ov->>'visit')::int,                      d.visit)                      AS visit,
    COALESCE((o.ov->>'no_show_reservation')::int,        d.no_show_reservation)        AS no_show_reservation,
    COALESCE((o.ov->>'cancel')::int,                     d.cancel)                     AS cancel
FROM mart_reservation_stats_system_daily d
LEFT JOIN overrides_pivoted o ON o.stat_date = d.stat_date
WHERE d.stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
ORDER BY d.stat_date
