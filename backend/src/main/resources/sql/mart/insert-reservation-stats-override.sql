INSERT INTO reservation_stats_override (
    product_type, stat_date, field_name, override_value, reason, created_by, created_at
) VALUES (
    :productType, CAST(:statDate AS DATE), :fieldName, :overrideValue, :reason, :createdBy, CURRENT_TIMESTAMP
)
