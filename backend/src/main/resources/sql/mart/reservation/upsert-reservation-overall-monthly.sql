INSERT INTO mart_reservation_overall_monthly (
    yr, mo,
    reservations, online, call_count, total,
    loaded_at
) VALUES (
    :yr, :mo,
    :reservations, :online, :call, :total,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    reservations = EXCLUDED.reservations,
    online       = EXCLUDED.online,
    call_count   = EXCLUDED.call_count,
    total        = EXCLUDED.total,
    loaded_at    = CURRENT_TIMESTAMP
