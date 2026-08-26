-- =========================================================
-- 전체지표 도메인 마트 (V7) — PR-12
-- Profile: postgres-mart
--
-- 한 개 테이블:
--   mart_overall_exam_weekly — 주간 검사자 종합지표 (OverallExamWeeklyItem)
--
-- PK: (yr, mo, wk) — 월 경계 클립 주 단위. partial 필드가 부분 주 여부.
-- 서비스가 Java에서 월~일 버킷팅 + 월 경계 클립을 수행한 결과를 그대로 저장.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_overall_exam_weekly (
    yr                  SMALLINT     NOT NULL,
    mo                  SMALLINT     NOT NULL,
    wk                  SMALLINT     NOT NULL,
    partial             BOOLEAN      NOT NULL DEFAULT FALSE,
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
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
    PRIMARY KEY (yr, mo, wk)
);

CREATE INDEX IF NOT EXISTS idx_mart_overall_exam_weekly_start
    ON mart_overall_exam_weekly (start_date);
