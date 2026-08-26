-- 백내장 마트에서 (yr, mo) 별 콜 계산에 필요한 채널 예약수 합계.
-- select-reservation-stats-cataract-daily.sql 과 동일한 override 오버레이 적용.
--
-- 예약 종합 콜 = 시력교정 콜(call+tm+tm재상담) + 백내장(new_patient + tm_reservation).
-- 이 SQL 은 그 백내장 몫만 담는다.
--   · new_patient    : 인바운드(컨택센터) ★신환
--   · tm_reservation : 아웃바운드(TM) 예약수
WITH latest_override AS (
    SELECT DISTINCT ON (stat_date, field_name)
        stat_date, field_name, override_value
    FROM reservation_stats_override
    WHERE product_type = 'CATARACT'
      AND field_name IN ('new_patient', 'tm_reservation')
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
        COALESCE((o.ov->>'new_patient')::int,    d.new_patient)    AS new_patient,
        COALESCE((o.ov->>'tm_reservation')::int, d.tm_reservation) AS tm_reservation
    FROM mart_reservation_stats_cataract_daily d
    LEFT JOIN overrides_pivoted o ON o.stat_date = d.stat_date
    WHERE d.stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
)
SELECT
    EXTRACT(YEAR  FROM stat_date)::int AS yr,
    EXTRACT(MONTH FROM stat_date)::int AS mo,
    COALESCE(SUM(new_patient), 0)::int    AS new_patient_cnt,
    COALESCE(SUM(tm_reservation), 0)::int AS tm_reservation_cnt
FROM merged
GROUP BY yr, mo
ORDER BY yr, mo
