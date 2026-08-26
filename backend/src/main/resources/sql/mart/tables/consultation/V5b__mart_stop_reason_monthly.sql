-- =========================================================
-- 검사 중단 사유 마트 (V5b) — stop-reason
-- Profile: postgres-mart
--
-- 원본 서비스: StopReasonStatsService.getMonthlyStats(years)
--   EXAM.STOP_YN='Y' 건 EXAM_MEMO 키워드 자동 분류 (수술불가/잠정중단 그룹).
--   total = 모든 사유 합 = EXAM.STOP_YN='Y' 월별 건수.
--   빈 달은 0-fill로 저장(서비스 계약 유지).
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_stop_reason_monthly (
    yr                    SMALLINT    NOT NULL,
    mo                    SMALLINT    NOT NULL,
    recommend_x           INTEGER     NOT NULL DEFAULT 0,
    lens_impossible       INTEGER     NOT NULL DEFAULT 0,
    keratoconus           INTEGER     NOT NULL DEFAULT 0,
    avellino              INTEGER     NOT NULL DEFAULT 0,
    glaucoma              INTEGER     NOT NULL DEFAULT 0,
    vision_change         INTEGER     NOT NULL DEFAULT 0,
    other                 INTEGER     NOT NULL DEFAULT 0,
    total                 INTEGER     NOT NULL DEFAULT 0,
    loaded_at             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
