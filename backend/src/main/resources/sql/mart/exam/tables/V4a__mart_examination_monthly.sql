-- =========================================================
-- 월별 검사통계 마트 (V4a) — ExaminationMonthlyItem
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 원본 서비스: ExaminationStatsService.getMonthlyStats(years)
--   visionCorrection = 시력교정(2024·2025는 레거시 확정값, 이후 EXAM 기준)
--   dreamlens        = 드림렌즈(EXAM 리스트 D만 있고 M 없는 행)
--   cataract         = 백내장(2024·2025 레거시, 이후 눈 단위)
--   examTotal, total = visionCorrection + dreamlens + cataract
-- 레거시 보정치가 적용된 값을 그대로 저장(현재 UI 값과 동일).
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_examination_monthly (
    yr                  SMALLINT    NOT NULL,
    mo                  SMALLINT    NOT NULL,
    vision_correction   INTEGER     NOT NULL DEFAULT 0,
    dreamlens           INTEGER     NOT NULL DEFAULT 0,
    cataract            INTEGER     NOT NULL DEFAULT 0,
    exam_total          INTEGER     NOT NULL DEFAULT 0,
    total               INTEGER     NOT NULL DEFAULT 0,
    loaded_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
