-- =========================================================
-- 백내장 예약통계 일별 마트 (V11b) — CataractStatsDailyRow
-- Profile: postgres-mart
--
-- 원본 SQL: sql/reservation-stats/cataract-daily-counts.sql
-- 시력교정과 채널 구성이 달라 별도 스키마.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_reservation_stats_cataract_daily (
    stat_date                     DATE         PRIMARY KEY,
    period                        CHAR(7)      NOT NULL,
    total_cataract                INTEGER      NOT NULL DEFAULT 0,
    total_presbyopia              INTEGER      NOT NULL DEFAULT 0,
    inbound_call                  INTEGER      NOT NULL DEFAULT 0,
    answered_call                 INTEGER      NOT NULL DEFAULT 0,
    new_exam_inquiry              INTEGER      NOT NULL DEFAULT 0,
    new_re_inquiry                INTEGER      NOT NULL DEFAULT 0,
    new_patient                   INTEGER      NOT NULL DEFAULT 0,
    tm_total_db                   INTEGER      NOT NULL DEFAULT 0,
    tm_valid_db                   INTEGER      NOT NULL DEFAULT 0,
    tm_reservation                INTEGER      NOT NULL DEFAULT 0,
    kakao_total_inquiry           INTEGER      NOT NULL DEFAULT 0,
    kakao_cataract_reservation    INTEGER      NOT NULL DEFAULT 0,
    kakao_presbyopia_reservation  INTEGER      NOT NULL DEFAULT 0,
    online_reservation            INTEGER      NOT NULL DEFAULT 0,
    online_no_show                INTEGER      NOT NULL DEFAULT 0,
    cancel_online                 INTEGER      NOT NULL DEFAULT 0,
    cancel_crm                    INTEGER      NOT NULL DEFAULT 0,
    cancel_kakao                  INTEGER      NOT NULL DEFAULT 0,
    visit                         INTEGER      NOT NULL DEFAULT 0,
    no_show_reservation           INTEGER      NOT NULL DEFAULT 0,
    cancel                        INTEGER      NOT NULL DEFAULT 0,
    loaded_at                     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mart_reservation_stats_cataract_daily_period
    ON mart_reservation_stats_cataract_daily (period);
