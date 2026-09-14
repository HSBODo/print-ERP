SELECT
    TO_CHAR(stat_date, 'YYYY-MM-DD') AS "statDate",
    group_key                        AS "groupKey",
    metric_key                       AS "metricKey",
    value                            AS value
FROM overseas_reservation_stats
WHERE stat_date BETWEEN CAST(:from AS date) AND CAST(:to AS date)
