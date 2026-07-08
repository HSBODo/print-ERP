INSERT INTO mart_examination_monthly (
    yr, mo,
    vision_correction, dreamlens, cataract, exam_total, total,
    loaded_at
) VALUES (
    :yr, :mo,
    :visionCorrection, :dreamlens, :cataract, :examTotal, :total,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    vision_correction = EXCLUDED.vision_correction,
    dreamlens         = EXCLUDED.dreamlens,
    cataract          = EXCLUDED.cataract,
    exam_total        = EXCLUDED.exam_total,
    total             = EXCLUDED.total,
    loaded_at         = CURRENT_TIMESTAMP
