INSERT INTO mart_reservation_rate_monthly (
    yr, mo, category,
    exam_count, surgery_booked_count, reservation_rate,
    loaded_at
) VALUES (
    :yr, :mo, :category,
    :examCount, :surgeryBookedCount, :reservationRate,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo, category) DO UPDATE SET
    exam_count           = EXCLUDED.exam_count,
    surgery_booked_count = EXCLUDED.surgery_booked_count,
    reservation_rate     = EXCLUDED.reservation_rate,
    loaded_at            = CURRENT_TIMESTAMP
