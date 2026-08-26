-- =========================================================
-- 예약자 명단 마트 (V3b)
-- Profile: postgres-mart
--
-- 원본 SQL: sql/softcrm/reservation/list/select-reservation-list.sql
--   등록일(InsertedDateTime) 기준 검사예약 명단 행 (RESERVE_FLAG='M' + 채널 필터 + junk 제외).
--   행 1개 = RESERVE_NUM 1개. delete+insert 패턴 (배치 로직이 유일성 담보).
-- =========================================================

CREATE TABLE IF NOT EXISTS list_reservation (
    id                BIGSERIAL     PRIMARY KEY,
    registered_at     DATE          NOT NULL,                    -- 등록일 (InsertedDateTime → YYYY-MM-DD)
    registered_time   VARCHAR(10)   NOT NULL DEFAULT '',         -- 등록시각 HH:MM
    reserve_date      VARCHAR(20)   NOT NULL DEFAULT '',         -- 예약일(원본 문자열 유지 — 빈값 가능)
    reserve_time      VARCHAR(20)   NOT NULL DEFAULT '',         -- 예약시각 (원본 START_TIME trim)
    chart_no          VARCHAR(50)   NOT NULL DEFAULT '',
    name              VARCHAR(100)  NOT NULL DEFAULT '',
    reserve_state     VARCHAR(4)    NOT NULL DEFAULT '',         -- Y/I/H/C 등
    channel           VARCHAR(20)   NOT NULL DEFAULT '',         -- 인콜/아웃콜/홈페이지/앱/네이버/카카오/기타
    channel_group     VARCHAR(10)   NOT NULL DEFAULT '',         -- 콜/온라인/기타
    doctor            VARCHAR(100)  NOT NULL DEFAULT '',
    counselor         VARCHAR(100)  NOT NULL DEFAULT '',
    comment           TEXT          NOT NULL DEFAULT '',
    -- 내원동기 (V39 · V40 · V42 통합)
    motive_l          VARCHAR(200)  NOT NULL DEFAULT '',         -- 내원동기(대)
    motive_m          VARCHAR(200)  NOT NULL DEFAULT '',         -- 내원동기(중)
    motive_m_source   VARCHAR(10)   NOT NULL DEFAULT '',         -- 내원동기(중) 출처 태그
    -- 연락처 (V44 통합) · person 판정에 사용
    hp                VARCHAR(30)   NOT NULL DEFAULT '',
    email             VARCHAR(200)  NOT NULL DEFAULT '',
    -- 예약 퍼널 상태 (V41 통합) — v_reservation_channel 파생
    exam_reg_date     VARCHAR(20)   NOT NULL DEFAULT '',         -- 검사 예약 등록일
    exam_stop         VARCHAR(4)    NOT NULL DEFAULT '',         -- 검사 중단 여부
    surgery_reg_date  VARCHAR(20)   NOT NULL DEFAULT '',         -- 수술 예약 등록일
    -- 수술 정보 (V45 · V49 통합) — 채널×op_type · 매출 계산에 사용
    surgery_r         VARCHAR(200)  NOT NULL DEFAULT '',         -- 우안 수술명
    surgery_l         VARCHAR(200)  NOT NULL DEFAULT '',         -- 좌안 수술명
    surgery_date      VARCHAR(20)   NOT NULL DEFAULT '',         -- 수술 실시일 (payment 찾는 키)
    surgery_payment   BIGINT        NOT NULL DEFAULT 0,          -- (고객·수술일) COSTPRICE 합
    loaded_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_reservation_registered
    ON list_reservation (registered_at);

CREATE INDEX IF NOT EXISTS idx_list_reservation_chart
    ON list_reservation (chart_no);

CREATE INDEX IF NOT EXISTS idx_list_reservation_registered_channel
    ON list_reservation (registered_at, channel_group);
