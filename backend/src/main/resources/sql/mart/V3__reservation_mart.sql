-- =========================================================
-- 예약 도메인 마트 (V3) — PR-4a
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 세 개 테이블:
--   mart_reservation_monthly    — 월별 수술/외래/드림렌즈 (ReservationMonthlyItem)
--   list_reservation            — 예약자 명단 행 (reservation-list.sql 출력 shape)
--   mart_reservation_kakao_daily — 카카오(해피톡) 일별 건수 (참고용 카운트)
-- =========================================================

-- ─── 월별 집계 마트 ───────────────────────────────────────
-- 원본 SQL: sql/reservation/monthly-by-type.sql
--   surgery    = RESERVE_FLAG='O'
--   outpatient = RESERVE_JINRYO='2'
--   dreamlens  = RESERVE_FLAG='D'
-- 공통 필터: RESERVE_STATE <> 'C'
CREATE TABLE IF NOT EXISTS mart_reservation_monthly (
    yr          SMALLINT    NOT NULL,
    mo          SMALLINT    NOT NULL,
    surgery     INTEGER     NOT NULL DEFAULT 0,
    outpatient  INTEGER     NOT NULL DEFAULT 0,
    dreamlens   INTEGER     NOT NULL DEFAULT 0,
    total       INTEGER     NOT NULL DEFAULT 0,
    loaded_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- ─── 예약자 명단 마트 ─────────────────────────────────────
-- 원본 SQL: sql/reservation-list/reservation-list.sql
--   등록일(InsertedDateTime) 기준 검사예약 명단 행 (RESERVE_FLAG='M' + 채널 필터 + junk 제외).
--   행 1개 = RESERVE_NUM 1개. delete+insert 패턴 (배치 로직이 유일성 담보).
CREATE TABLE IF NOT EXISTS list_reservation (
    id              BIGSERIAL     PRIMARY KEY,
    registered_at   DATE          NOT NULL,                    -- 등록일 (InsertedDateTime → YYYY-MM-DD)
    registered_time VARCHAR(10)   NOT NULL DEFAULT '',         -- 등록시각 HH:MM
    reserve_date    VARCHAR(20)   NOT NULL DEFAULT '',         -- 예약일(원본 문자열 유지 — 빈값 가능)
    reserve_time    VARCHAR(20)   NOT NULL DEFAULT '',         -- 예약시각 (원본 START_TIME trim)
    chart_no        VARCHAR(50)   NOT NULL DEFAULT '',
    name            VARCHAR(100)  NOT NULL DEFAULT '',
    reserve_state   VARCHAR(4)    NOT NULL DEFAULT '',         -- Y/I/H/C 등
    channel         VARCHAR(20)   NOT NULL DEFAULT '',         -- 인콜/아웃콜/홈페이지/앱/네이버/카카오/기타
    channel_group   VARCHAR(10)   NOT NULL DEFAULT '',         -- 콜/온라인/기타
    doctor          VARCHAR(100)  NOT NULL DEFAULT '',
    counselor       VARCHAR(100)  NOT NULL DEFAULT '',
    comment         TEXT          NOT NULL DEFAULT '',
    loaded_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_reservation_registered
    ON list_reservation (registered_at);

CREATE INDEX IF NOT EXISTS idx_list_reservation_chart
    ON list_reservation (chart_no);

CREATE INDEX IF NOT EXISTS idx_list_reservation_registered_channel
    ON list_reservation (registered_at, channel_group);


-- ─── 카카오(해피톡) 일별 건수 마트 ─────────────────────────
-- 원본 SQL: sql/reservation-list/kakao-count.sql (범위 SUM → 일별 GROUP BY)
--   ReservationListResult.kakaoCount 계산용. 명단(list_reservation)에는 없고 해피톡에만 있는
--   카카오 예약을 참고용으로 별도 저장. 조회 시 요청 범위의 count SUM.
CREATE TABLE IF NOT EXISTS mart_reservation_kakao_daily (
    dt          DATE        PRIMARY KEY,
    kakao_count INTEGER     NOT NULL DEFAULT 0,
    loaded_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
