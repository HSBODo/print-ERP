INSERT INTO overseas_reservation_stats (stat_date, group_key, metric_key, value, source, updated_by, updated_at)
VALUES (CAST(:date AS date), :groupKey, :metricKey, :value, 'manual', :actor, CURRENT_TIMESTAMP)
ON CONFLICT (stat_date, group_key, metric_key)
DO UPDATE SET
    value      = EXCLUDED.value,
    source     = 'manual',
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP
