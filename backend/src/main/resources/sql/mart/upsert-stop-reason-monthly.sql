INSERT INTO mart_stop_reason_monthly (
    yr, mo,
    recommend_x, lens_impossible, keratoconus, avellino, glaucoma, vision_change, other, total,
    loaded_at
) VALUES (
    :yr, :mo,
    :recommendX, :lensImpossible, :keratoconus, :avellino, :glaucoma, :visionChange, :other, :total,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    recommend_x     = EXCLUDED.recommend_x,
    lens_impossible = EXCLUDED.lens_impossible,
    keratoconus     = EXCLUDED.keratoconus,
    avellino        = EXCLUDED.avellino,
    glaucoma        = EXCLUDED.glaucoma,
    vision_change   = EXCLUDED.vision_change,
    other           = EXCLUDED.other,
    total           = EXCLUDED.total,
    loaded_at       = CURRENT_TIMESTAMP
