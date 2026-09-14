-- =========================================================
-- 시력교정 예약통계 일별 마트 (V11a) — ReservationStatsDailyRow
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §7 (스냅샷 파일→마트 이관)
--
-- 원본 SQL: sql/reservation-stats/system-daily-counts.sql
-- CH01~CH24 원시 카운트를 그대로 저장(파생값은 프론트가 계산).
-- 배치 정책: 매일 D-1 하루만 upsert (소급 변동 감수). 잠긴 월은 배치가 스킵.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_reservation_stats_system_daily (
    stat_date                  DATE         PRIMARY KEY,
    period                     CHAR(7)      NOT NULL,       -- YYYY-MM (잠금·조회 조인용)
    inbound_call               INTEGER      NOT NULL DEFAULT 0,  -- CH01
    answered_call              INTEGER      NOT NULL DEFAULT 0,  -- CH02
    new_inquiry                INTEGER      NOT NULL DEFAULT 0,  -- CH03
    call_reservation           INTEGER      NOT NULL DEFAULT 0,  -- CH04
    tm_total_db                INTEGER      NOT NULL DEFAULT 0,  -- CH05
    tm_valid_db                INTEGER      NOT NULL DEFAULT 0,  -- CH06
    tm_reservation             INTEGER      NOT NULL DEFAULT 0,  -- CH07
    tm_recounsel               INTEGER      NOT NULL DEFAULT 0,  -- CH08
    tm_recounsel_valid         INTEGER      NOT NULL DEFAULT 0,  -- CH09
    tm_recounsel_reservation   INTEGER      NOT NULL DEFAULT 0,  -- CH10
    home_received              INTEGER      NOT NULL DEFAULT 0,  -- CH11
    home_reservation           INTEGER      NOT NULL DEFAULT 0,  -- CH12
    naver_received             INTEGER      NOT NULL DEFAULT 0,  -- CH13
    naver_rejected             INTEGER      NOT NULL DEFAULT 0,  -- CH14
    naver_valid                INTEGER      NOT NULL DEFAULT 0,  -- CH15
    naver_reservation          INTEGER      NOT NULL DEFAULT 0,  -- CH16
    kakao_inquiry              INTEGER      NOT NULL DEFAULT 0,  -- CH17
    kakao_reservation          INTEGER      NOT NULL DEFAULT 0,  -- CH18
    cancel_call_naver          INTEGER      NOT NULL DEFAULT 0,  -- CH19
    cancel_home                INTEGER      NOT NULL DEFAULT 0,  -- CH20
    cancel_kakao               INTEGER      NOT NULL DEFAULT 0,  -- CH21
    visit                      INTEGER      NOT NULL DEFAULT 0,  -- CH22
    no_show_reservation        INTEGER      NOT NULL DEFAULT 0,  -- CH23
    cancel                     INTEGER      NOT NULL DEFAULT 0,  -- CH24
    loaded_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mart_reservation_stats_system_daily_period
    ON mart_reservation_stats_system_daily (period);
