INSERT INTO mart_outpatient_count_monthly (
    yr, mo, outpatient_count, total, loaded_at
) VALUES (
    :yr, :mo, :outpatientCount, :total, CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    outpatient_count = EXCLUDED.outpatient_count,
    total            = EXCLUDED.total,
    loaded_at        = CURRENT_TIMESTAMP
