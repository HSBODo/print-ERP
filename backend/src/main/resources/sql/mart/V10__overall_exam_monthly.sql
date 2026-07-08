-- =========================================================
-- 전체지표 도메인 마트 (V10) — 월별 검사자 종합지표
-- Profile: postgres-mart
--
-- 한 개 테이블:
--   mart_overall_exam_monthly — 월간 검사자 종합지표 (OverallExamMonthlyItem)
--
-- PK: (yr, mo). partial 은 진행 중 월의 부분 집계 여부.
-- 24·25 는 프론트 하드코딩(레거시 엑셀 마감값)이 유일한 진실이라 이 마트에 시드하지 않는다.
-- 배치는 batch.mart.min-year(=2026) 가드로 26년부터만 upsert.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_overall_exam_monthly (
    yr                  SMALLINT     NOT NULL,
    mo                  SMALLINT     NOT NULL,
    partial             BOOLEAN      NOT NULL DEFAULT FALSE,
    total_exam          INTEGER      NOT NULL DEFAULT 0,
    intro_general       INTEGER      NOT NULL DEFAULT 0,
    intro_customer      INTEGER      NOT NULL DEFAULT 0,
    intro_staff         INTEGER      NOT NULL DEFAULT 0,
    job_office          INTEGER      NOT NULL DEFAULT 0,
    job_student         INTEGER      NOT NULL DEFAULT 0,
    job_etc             INTEGER      NOT NULL DEFAULT 0,
    vision_booked       INTEGER      NOT NULL DEFAULT 0,
    cataract_total      INTEGER      NOT NULL DEFAULT 0,
    cataract_only       INTEGER      NOT NULL DEFAULT 0,
    cataract_booked     INTEGER      NOT NULL DEFAULT 0,
    stop_count          INTEGER      NOT NULL DEFAULT 0,
    vision_exam         INTEGER      NOT NULL DEFAULT 0,
    dreamlens           INTEGER      NOT NULL DEFAULT 0,
    one_day             INTEGER      NOT NULL DEFAULT 0,
    one_day_booked      INTEGER      NOT NULL DEFAULT 0,
    loaded_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);

CREATE INDEX IF NOT EXISTS idx_mart_overall_exam_monthly_yr
    ON mart_overall_exam_monthly (yr);
