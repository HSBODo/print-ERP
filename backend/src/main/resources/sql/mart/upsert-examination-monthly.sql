-- 월별 검사통계 마트 upsert.
--
-- ⚠️ 2026-01~05 의 cataract 는 골든 확정값(V22 seed)이라 덮어쓰지 않는다.
--    백내장 검사수 분류가 CUSTOM 의 현재 담당자 값을 참조해 과거 달이 소급 변동하기 때문이다.
--    신규 정의(사람 기준)는 2026-06 부터 적용한다. 배경은 V22__examination_monthly_2026_cataract_golden.sql 참조.
--    2024·2025 전체는 ExamMartJob 의 min-year 가드가 write 자체를 막는다.
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
    cataract          = CASE WHEN mart_examination_monthly.yr = 2026
                              AND mart_examination_monthly.mo <= 5
                             THEN mart_examination_monthly.cataract
                             ELSE EXCLUDED.cataract END,
    exam_total        = EXCLUDED.vision_correction + EXCLUDED.dreamlens
                        + CASE WHEN mart_examination_monthly.yr = 2026
                                AND mart_examination_monthly.mo <= 5
                               THEN mart_examination_monthly.cataract
                               ELSE EXCLUDED.cataract END,
    total             = EXCLUDED.vision_correction + EXCLUDED.dreamlens
                        + CASE WHEN mart_examination_monthly.yr = 2026
                                AND mart_examination_monthly.mo <= 5
                               THEN mart_examination_monthly.cataract
                               ELSE EXCLUDED.cataract END,
    loaded_at         = CURRENT_TIMESTAMP
