-- =========================================================
-- 예약통계 도메인 마트 (V11) — 시력교정·백내장 일별 원시 카운트
-- Profile: postgres-mart
--
-- 네 개 테이블:
--   mart_reservation_stats_system_daily    — 시력교정 일별 (ReservationStatsDailyRow)
--   mart_reservation_stats_cataract_daily  — 백내장 일별   (CataractStatsDailyRow)
--   reservation_stats_period_lock          — 월 확정(잠금) 상태 — 배치 덮어쓰기 방어
--   reservation_stats_override             — 셀 수기 보정 이력 (INSERT-only 감사 로그)
--
-- 배치 정책: 매일 D-1 하루만 upsert (소급 변동 감수). 잠긴 월은 배치가 스킵.
-- 관련 문서: docs/databatch/strategy.md §7 (스냅샷 파일→마트 이관)
-- =========================================================

-- ─── 시력교정 일별 마트 ────────────────────────────────────
-- 원본 SQL: sql/reservation-stats/system-daily-counts.sql
-- CH01~CH24 원시 카운트를 그대로 저장(파생값은 프론트가 계산).
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


-- ─── 백내장 일별 마트 ──────────────────────────────────────
-- 원본 SQL: sql/reservation-stats/cataract-daily-counts.sql
-- 시력교정과 채널 구성이 달라 별도 스키마.
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


-- ─── 월 확정(잠금) 상태 ────────────────────────────────────
-- 확정된 월은 배치가 덮어쓰지 못하도록 배치 잡이 이 테이블을 확인 후 필터링.
-- product_type: 'SYSTEM' | 'CATARACT'
CREATE TABLE IF NOT EXISTS reservation_stats_period_lock (
    product_type   VARCHAR(16)   NOT NULL,
    period         CHAR(7)       NOT NULL,
    locked_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_by      VARCHAR(64)   NOT NULL,
    PRIMARY KEY (product_type, period)
);


-- ─── 셀 수기 보정 이력 ─────────────────────────────────────
-- INSERT-only 감사 로그. 조회 시 (product_type, stat_date, field_name) 기준
-- 최신(created_at DESC) 1건을 원본 카운트 위에 얹어 응답.
-- 배치는 이 테이블과 무관 — override 는 항상 원본과 분리되어 보존됨.
CREATE TABLE IF NOT EXISTS reservation_stats_override (
    id              BIGSERIAL     PRIMARY KEY,
    product_type    VARCHAR(16)   NOT NULL,
    stat_date       DATE          NOT NULL,
    field_name      VARCHAR(64)   NOT NULL,
    override_value  INTEGER       NOT NULL,
    reason          TEXT,
    created_by      VARCHAR(64)   NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservation_stats_override_lookup
    ON reservation_stats_override (product_type, stat_date, field_name, created_at DESC);
