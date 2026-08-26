-- 시력교정 마트에서 (yr, mo) 별 예약 종합 계산에 필요한 채널 예약수 합계.
-- select-reservation-stats-system-daily.sql 과 동일한 override 오버레이 적용.
--
--   온라인: naver_reservation, kakao_reservation
--   콜:     call_reservation(인콜), tm_reservation(TM), tm_recounsel_reservation(재상담)
WITH latest_override AS (
    SELECT DISTINCT ON (stat_date, field_name)
        stat_date, field_name, override_value
    FROM reservation_stats_override
    WHERE product_type = 'SYSTEM'
      AND field_name IN (
          'naver_reservation', 'kakao_reservation',
          'call_reservation', 'tm_reservation', 'tm_recounsel_reservation'
      )
      AND stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
    ORDER BY stat_date, field_name, created_at DESC
),
overrides_pivoted AS (
    SELECT stat_date, jsonb_object_agg(field_name, override_value) AS ov
    FROM latest_override
    GROUP BY stat_date
),
merged AS (
    SELECT
        d.stat_date,
        COALESCE((o.ov->>'naver_reservation')::int,          d.naver_reservation)          AS naver_reservation,
        COALESCE((o.ov->>'kakao_reservation')::int,          d.kakao_reservation)          AS kakao_reservation,
        COALESCE((o.ov->>'call_reservation')::int,           d.call_reservation)           AS call_reservation,
        COALESCE((o.ov->>'tm_reservation')::int,             d.tm_reservation)             AS tm_reservation,
        COALESCE((o.ov->>'tm_recounsel_reservation')::int,   d.tm_recounsel_reservation)   AS tm_recounsel_reservation
    FROM mart_reservation_stats_system_daily d
    LEFT JOIN overrides_pivoted o ON o.stat_date = d.stat_date
    WHERE d.stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
)
SELECT
    EXTRACT(YEAR  FROM stat_date)::int AS yr,
    EXTRACT(MONTH FROM stat_date)::int AS mo,
    COALESCE(SUM(naver_reservation), 0)::int          AS naver_cnt,
    COALESCE(SUM(kakao_reservation), 0)::int          AS kakao_cnt,
    COALESCE(SUM(call_reservation), 0)::int           AS call_reservation_cnt,
    COALESCE(SUM(tm_reservation), 0)::int             AS tm_reservation_cnt,
    COALESCE(SUM(tm_recounsel_reservation), 0)::int   AS tm_recounsel_reservation_cnt
FROM merged
GROUP BY yr, mo
ORDER BY yr, mo
