INSERT INTO mart_reservation_monthly (
    yr, mo,
    surgery, outpatient, dreamlens, total,
    loaded_at
) VALUES (
    :yr, :mo,
    :surgery, :outpatient, :dreamlens, :total,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    surgery    = EXCLUDED.surgery,
    outpatient = EXCLUDED.outpatient,
    dreamlens  = EXCLUDED.dreamlens,
    total      = EXCLUDED.total,
    loaded_at  = CURRENT_TIMESTAMP
