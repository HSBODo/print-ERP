INSERT INTO mart_consultation_rate_monthly (
    yr, mo,
    vision_exam_count, vision_counsel_count, vision_surgery_booked, vision_actual_surgery,
    vision_surgery_rate, vision_counsel_rate,
    vision_counsel_rate_oneday, vision_counsel_rate_general, vision_general_book_rate,
    cataract_exam_count, cataract_surgery_booked, cataract_stopped_count, cataract_surgery_rate,
    loaded_at
) VALUES (
    :yr, :mo,
    :visionExamCount, :visionCounselCount, :visionSurgeryBooked, :visionActualSurgery,
    :visionSurgeryRate, :visionCounselRate,
    :visionCounselRateOneday, :visionCounselRateGeneral, :visionGeneralBookRate,
    :cataractExamCount, :cataractSurgeryBooked, :cataractStoppedCount, :cataractSurgeryRate,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    vision_exam_count           = EXCLUDED.vision_exam_count,
    vision_counsel_count        = EXCLUDED.vision_counsel_count,
    vision_surgery_booked       = EXCLUDED.vision_surgery_booked,
    vision_actual_surgery       = EXCLUDED.vision_actual_surgery,
    vision_surgery_rate         = EXCLUDED.vision_surgery_rate,
    vision_counsel_rate         = EXCLUDED.vision_counsel_rate,
    vision_counsel_rate_oneday  = EXCLUDED.vision_counsel_rate_oneday,
    vision_counsel_rate_general = EXCLUDED.vision_counsel_rate_general,
    vision_general_book_rate    = EXCLUDED.vision_general_book_rate,
    cataract_exam_count         = EXCLUDED.cataract_exam_count,
    cataract_surgery_booked     = EXCLUDED.cataract_surgery_booked,
    cataract_stopped_count      = EXCLUDED.cataract_stopped_count,
    cataract_surgery_rate       = EXCLUDED.cataract_surgery_rate,
    loaded_at                   = CURRENT_TIMESTAMP
