-- =========================================================
-- B&VIIT Analytics — Postgres 스키마 DDL (ERD Cloud 임포트용)
-- 생성 기준:
--   • MartSchemaInitializer 가 부팅 시 실행하는 V1~V21 마트 스크립트
--   • JPA @Entity: com.bviit.analytics.auth.entity.User (users 테이블)
--
-- 참고:
--   • IF NOT EXISTS / DEFAULT / ON CONFLICT 는 그대로 유지 (Postgres 문법)
--   • V13~V16, V18~V20, V9 는 seed(데이터)만 있어 미포함
--   • V17 의 ALTER (batch_run_log.table_stats JSONB) 는 V1 CREATE 에 병합
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- 인증 (JPA @Entity)
-- ─────────────────────────────────────────────────────────

-- users (com.bviit.analytics.auth.entity.User)
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL     PRIMARY KEY,
    login_id    VARCHAR(255)  NOT NULL UNIQUE,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,
    name        VARCHAR(255)  NOT NULL,
    role        VARCHAR(20)   NOT NULL DEFAULT 'USER'    -- Enum: USER | ADMIN
);


-- =========================================================
-- V1 — 배치 메타 (batch_run_log + V17 병합, batch_watermark)
-- =========================================================

CREATE TABLE IF NOT EXISTS batch_run_log (
    id              BIGSERIAL       PRIMARY KEY,
    job_name        VARCHAR(100)    NOT NULL,
    run_type        VARCHAR(20)     NOT NULL,           -- DAILY | MONTHLY_RECONCILE | MANUAL
    target_from     DATE,
    target_to       DATE,
    status          VARCHAR(20)     NOT NULL,           -- RUNNING | SUCCESS | FAILED
    rows_upserted   INTEGER         NOT NULL DEFAULT 0,
    started_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at     TIMESTAMP,
    duration_ms     BIGINT,
    error_message   TEXT,
    table_stats     JSONB                                -- V17: 테이블별 upsert 건수
);

CREATE INDEX IF NOT EXISTS idx_batch_run_log_job_started
    ON batch_run_log (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_batch_run_log_status
    ON batch_run_log (status);

CREATE TABLE IF NOT EXISTS batch_watermark (
    mart_name       VARCHAR(100)    PRIMARY KEY,
    last_loaded_at  DATE            NOT NULL,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- V2 — 수술 도메인
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_surgery_monthly (
    yr                  SMALLINT    NOT NULL,
    mo                  SMALLINT    NOT NULL,
    lasek               INTEGER     NOT NULL DEFAULT 0,
    lasik               INTEGER     NOT NULL DEFAULT 0,
    smile               INTEGER     NOT NULL DEFAULT 0,
    smile_pro           INTEGER     NOT NULL DEFAULT 0,
    icl                 INTEGER     NOT NULL DEFAULT 0,
    t_icl               INTEGER     NOT NULL DEFAULT 0,
    kpl                 INTEGER     NOT NULL DEFAULT 0,
    t_kpl               INTEGER     NOT NULL DEFAULT 0,
    viva                INTEGER     NOT NULL DEFAULT 0,
    cat_multi           INTEGER     NOT NULL DEFAULT 0,
    cat_mono            INTEGER     NOT NULL DEFAULT 0,
    cat_edof            INTEGER     NOT NULL DEFAULT 0,
    xtra                INTEGER     NOT NULL DEFAULT 0,
    wave_vision         INTEGER     NOT NULL DEFAULT 0,
    mono_vision         INTEGER     NOT NULL DEFAULT 0,
    contra              INTEGER     NOT NULL DEFAULT 0,
    personal            INTEGER     NOT NULL DEFAULT 0,
    lasek_ex            INTEGER     NOT NULL DEFAULT 0,
    lasek_red           INTEGER     NOT NULL DEFAULT 0,
    reoperation         INTEGER     NOT NULL DEFAULT 0,
    reop_laser          INTEGER     NOT NULL DEFAULT 0,
    reop_lens           INTEGER     NOT NULL DEFAULT 0,
    vision_patients     INTEGER     NOT NULL DEFAULT 0,
    cataract_patients   INTEGER     NOT NULL DEFAULT 0,
    total               INTEGER     NOT NULL DEFAULT 0,
    loaded_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);

CREATE TABLE IF NOT EXISTS mart_surgery_daily (
    dt                  DATE        PRIMARY KEY,
    lasek               INTEGER     NOT NULL DEFAULT 0,
    lasik               INTEGER     NOT NULL DEFAULT 0,
    smile               INTEGER     NOT NULL DEFAULT 0,
    smile_pro           INTEGER     NOT NULL DEFAULT 0,
    icl                 INTEGER     NOT NULL DEFAULT 0,
    t_icl               INTEGER     NOT NULL DEFAULT 0,
    kpl                 INTEGER     NOT NULL DEFAULT 0,
    t_kpl               INTEGER     NOT NULL DEFAULT 0,
    viva                INTEGER     NOT NULL DEFAULT 0,
    cat_multi           INTEGER     NOT NULL DEFAULT 0,
    cat_mono            INTEGER     NOT NULL DEFAULT 0,
    cat_edof            INTEGER     NOT NULL DEFAULT 0,
    xtra                INTEGER     NOT NULL DEFAULT 0,
    wave_vision         INTEGER     NOT NULL DEFAULT 0,
    mono_vision         INTEGER     NOT NULL DEFAULT 0,
    contra              INTEGER     NOT NULL DEFAULT 0,
    personal            INTEGER     NOT NULL DEFAULT 0,
    lasek_ex            INTEGER     NOT NULL DEFAULT 0,
    lasek_red           INTEGER     NOT NULL DEFAULT 0,
    reoperation         INTEGER     NOT NULL DEFAULT 0,
    reop_laser          INTEGER     NOT NULL DEFAULT 0,
    reop_lens           INTEGER     NOT NULL DEFAULT 0,
    vision_patients     INTEGER     NOT NULL DEFAULT 0,
    cataract_patients   INTEGER     NOT NULL DEFAULT 0,
    total               INTEGER     NOT NULL DEFAULT 0,
    loaded_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS list_surgery (
    id                    BIGSERIAL     PRIMARY KEY,
    chart_no              VARCHAR(50),
    name                  VARCHAR(100),
    name_eng              VARCHAR(100),
    surgery_category      VARCHAR(20)   NOT NULL,       -- '시력교정' | '백내장'
    surgery_date          DATE          NOT NULL,
    exam_date             DATE,
    patient_type          VARCHAR(10),                  -- '신환' | '구환'
    surgery_reserve_date  DATE,
    surgery_reg_date      DATE,
    surgery_time          VARCHAR(20),
    surgery_r             VARCHAR(200),
    surgery_l             VARCHAR(200),
    recommended_r         VARCHAR(200),
    recommended_l         VARCHAR(200),
    estimate              VARCHAR(200),
    surgery_rate          VARCHAR(50),
    payment               VARCHAR(50),
    surgeon               VARCHAR(100),
    counselor             VARCHAR(100),
    doctor                VARCHAR(100),
    optometrist           VARCHAR(100),
    birth                 VARCHAR(20),
    lunar                 VARCHAR(4),                   -- '음' | '양'
    phone1                VARCHAR(50),
    phone2                VARCHAR(50),
    email                 VARCHAR(200),
    zip                   VARCHAR(20),
    addr1                 VARCHAR(500),
    addr2                 VARCHAR(500),
    memo                  TEXT,
    grade                 VARCHAR(50),
    job                   VARCHAR(100),
    last_visit            DATE,
    route                 VARCHAR(200),
    section               VARCHAR(50),
    motive_l              VARCHAR(200),
    motive_m              VARCHAR(200),
    motive_s              VARCHAR(200),
    motive_memo           TEXT,
    exam_memo             TEXT,
    insurance             VARCHAR(100),
    nationality           VARCHAR(100),
    loaded_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_surgery_date          ON list_surgery (surgery_date);
CREATE INDEX IF NOT EXISTS idx_list_surgery_cust          ON list_surgery (chart_no);
CREATE INDEX IF NOT EXISTS idx_list_surgery_date_category ON list_surgery (surgery_date, surgery_category);


-- =========================================================
-- V3 — 예약 도메인
-- =========================================================

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

CREATE TABLE IF NOT EXISTS list_reservation (
    id              BIGSERIAL     PRIMARY KEY,
    registered_at   DATE          NOT NULL,
    registered_time VARCHAR(10)   NOT NULL DEFAULT '',
    reserve_date    VARCHAR(20)   NOT NULL DEFAULT '',
    reserve_time    VARCHAR(20)   NOT NULL DEFAULT '',
    chart_no        VARCHAR(50)   NOT NULL DEFAULT '',
    name            VARCHAR(100)  NOT NULL DEFAULT '',
    reserve_state   VARCHAR(4)    NOT NULL DEFAULT '',   -- Y/I/H/C
    channel         VARCHAR(20)   NOT NULL DEFAULT '',   -- 인콜/아웃콜/홈페이지/앱/네이버/카카오/기타
    channel_group   VARCHAR(10)   NOT NULL DEFAULT '',   -- 콜/온라인/기타
    doctor          VARCHAR(100)  NOT NULL DEFAULT '',
    counselor       VARCHAR(100)  NOT NULL DEFAULT '',
    comment         TEXT          NOT NULL DEFAULT '',
    loaded_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_reservation_registered         ON list_reservation (registered_at);
CREATE INDEX IF NOT EXISTS idx_list_reservation_chart              ON list_reservation (chart_no);
CREATE INDEX IF NOT EXISTS idx_list_reservation_registered_channel ON list_reservation (registered_at, channel_group);

CREATE TABLE IF NOT EXISTS mart_reservation_kakao_daily (
    dt          DATE        PRIMARY KEY,
    kakao_count INTEGER     NOT NULL DEFAULT 0,
    loaded_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- V4 — 검사 도메인
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

CREATE TABLE IF NOT EXISTS mart_procedure_exam_monthly (
    yr                     SMALLINT    NOT NULL,
    mo                     SMALLINT    NOT NULL,
    exam_count             INTEGER     NOT NULL DEFAULT 0,
    one_day_exam_count     INTEGER     NOT NULL DEFAULT 0,
    total                  INTEGER     NOT NULL DEFAULT 0,
    loaded_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);

CREATE TABLE IF NOT EXISTS list_exam (
    id                      BIGSERIAL     PRIMARY KEY,
    exam_date               DATE          NOT NULL,
    chart_no                VARCHAR(50)   NOT NULL DEFAULT '',
    name                    VARCHAR(100)  NOT NULL DEFAULT '',
    name_eng                VARCHAR(200)  NOT NULL DEFAULT '',
    exam_type               VARCHAR(50)   NOT NULL DEFAULT '',
    exam_category           VARCHAR(20)   NOT NULL DEFAULT '',
    patient_type            VARCHAR(20)   NOT NULL DEFAULT '',
    exam_reg_date           VARCHAR(20)   NOT NULL DEFAULT '',
    exam_memo               TEXT          NOT NULL DEFAULT '',
    estimate                VARCHAR(100)  NOT NULL DEFAULT '',
    surgery_rate            VARCHAR(20)   NOT NULL DEFAULT '',
    exam_time               VARCHAR(20)   NOT NULL DEFAULT '',
    recommended_r           VARCHAR(200)  NOT NULL DEFAULT '',
    recommended_l           VARCHAR(200)  NOT NULL DEFAULT '',
    surgery_reg_date        VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_reserve_date    VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_date            VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_r               VARCHAR(200)  NOT NULL DEFAULT '',
    surgery_l               VARCHAR(200)  NOT NULL DEFAULT '',
    surgeon                 VARCHAR(100)  NOT NULL DEFAULT '',
    payment                 VARCHAR(30)   NOT NULL DEFAULT '',
    counselor               VARCHAR(100)  NOT NULL DEFAULT '',
    doctor                  VARCHAR(100)  NOT NULL DEFAULT '',
    jumin                   VARCHAR(50)   NOT NULL DEFAULT '',
    birth                   VARCHAR(20)   NOT NULL DEFAULT '',
    lunar                   VARCHAR(4)    NOT NULL DEFAULT '',
    phone1                  VARCHAR(30)   NOT NULL DEFAULT '',
    phone2                  VARCHAR(30)   NOT NULL DEFAULT '',
    email                   VARCHAR(200)  NOT NULL DEFAULT '',
    zip                     VARCHAR(20)   NOT NULL DEFAULT '',
    addr1                   VARCHAR(500)  NOT NULL DEFAULT '',
    addr2                   VARCHAR(500)  NOT NULL DEFAULT '',
    memo                    TEXT          NOT NULL DEFAULT '',
    exam_stop               VARCHAR(4)    NOT NULL DEFAULT '',
    op_impossible           VARCHAR(4)    NOT NULL DEFAULT '',
    route                   VARCHAR(30)   NOT NULL DEFAULT '',
    section                 VARCHAR(30)   NOT NULL DEFAULT '',
    motive_l                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_m                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_s                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_memo             TEXT          NOT NULL DEFAULT '',
    optometrist             VARCHAR(100)  NOT NULL DEFAULT '',
    cancel_code             VARCHAR(20)   NOT NULL DEFAULT '',
    cancel_memo             TEXT          NOT NULL DEFAULT '',
    grade                   VARCHAR(20)   NOT NULL DEFAULT '',
    job                     VARCHAR(100)  NOT NULL DEFAULT '',
    last_visit              VARCHAR(20)   NOT NULL DEFAULT '',
    insurance               VARCHAR(100)  NOT NULL DEFAULT '',
    nationality             VARCHAR(100)  NOT NULL DEFAULT '',
    loaded_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_exam_exam_date ON list_exam (exam_date);
CREATE INDEX IF NOT EXISTS idx_list_exam_chart     ON list_exam (chart_no);

CREATE TABLE IF NOT EXISTS list_cataract_exam (
    id                      BIGSERIAL     PRIMARY KEY,
    exam_date               DATE          NOT NULL,
    chart_no                VARCHAR(50)   NOT NULL DEFAULT '',
    name                    VARCHAR(100)  NOT NULL DEFAULT '',
    name_eng                VARCHAR(200)  NOT NULL DEFAULT '',
    exam_type               VARCHAR(50)   NOT NULL DEFAULT '',
    exam_category           VARCHAR(20)   NOT NULL DEFAULT '',
    patient_type            VARCHAR(20)   NOT NULL DEFAULT '',
    exam_reg_date           VARCHAR(20)   NOT NULL DEFAULT '',
    exam_memo               TEXT          NOT NULL DEFAULT '',
    estimate                VARCHAR(100)  NOT NULL DEFAULT '',
    surgery_rate            VARCHAR(20)   NOT NULL DEFAULT '',
    exam_time               VARCHAR(20)   NOT NULL DEFAULT '',
    recommended_r           VARCHAR(200)  NOT NULL DEFAULT '',
    recommended_l           VARCHAR(200)  NOT NULL DEFAULT '',
    surgery_reg_date        VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_reserve_date    VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_date            VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_r               VARCHAR(200)  NOT NULL DEFAULT '',
    surgery_l               VARCHAR(200)  NOT NULL DEFAULT '',
    surgeon                 VARCHAR(100)  NOT NULL DEFAULT '',
    payment                 VARCHAR(30)   NOT NULL DEFAULT '',
    counselor               VARCHAR(100)  NOT NULL DEFAULT '',
    doctor                  VARCHAR(100)  NOT NULL DEFAULT '',
    jumin                   VARCHAR(50)   NOT NULL DEFAULT '',
    birth                   VARCHAR(20)   NOT NULL DEFAULT '',
    lunar                   VARCHAR(4)    NOT NULL DEFAULT '',
    phone1                  VARCHAR(30)   NOT NULL DEFAULT '',
    phone2                  VARCHAR(30)   NOT NULL DEFAULT '',
    email                   VARCHAR(200)  NOT NULL DEFAULT '',
    zip                     VARCHAR(20)   NOT NULL DEFAULT '',
    addr1                   VARCHAR(500)  NOT NULL DEFAULT '',
    addr2                   VARCHAR(500)  NOT NULL DEFAULT '',
    memo                    TEXT          NOT NULL DEFAULT '',
    exam_stop               VARCHAR(4)    NOT NULL DEFAULT '',
    op_impossible           VARCHAR(4)    NOT NULL DEFAULT '',
    route                   VARCHAR(30)   NOT NULL DEFAULT '',
    section                 VARCHAR(30)   NOT NULL DEFAULT '',
    motive_l                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_m                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_s                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_memo             TEXT          NOT NULL DEFAULT '',
    optometrist             VARCHAR(100)  NOT NULL DEFAULT '',
    cancel_code             VARCHAR(20)   NOT NULL DEFAULT '',
    cancel_memo             TEXT          NOT NULL DEFAULT '',
    grade                   VARCHAR(20)   NOT NULL DEFAULT '',
    job                     VARCHAR(100)  NOT NULL DEFAULT '',
    last_visit              VARCHAR(20)   NOT NULL DEFAULT '',
    insurance               VARCHAR(100)  NOT NULL DEFAULT '',
    nationality             VARCHAR(100)  NOT NULL DEFAULT '',
    classification          VARCHAR(20)   NOT NULL DEFAULT '',   -- V23: '백내장' | '중단'
    loaded_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_cataract_exam_exam_date ON list_cataract_exam (exam_date);
CREATE INDEX IF NOT EXISTS idx_list_cataract_exam_chart     ON list_cataract_exam (chart_no);


-- =========================================================
-- V5 — 전환·성공률 도메인
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_consultation_rate_monthly (
    yr                             SMALLINT         NOT NULL,
    mo                             SMALLINT         NOT NULL,
    vision_exam_count              INTEGER          NOT NULL DEFAULT 0,
    vision_counsel_count           INTEGER          NOT NULL DEFAULT 0,
    vision_surgery_booked          INTEGER          NOT NULL DEFAULT 0,
    vision_actual_surgery          INTEGER          NOT NULL DEFAULT 0,
    vision_surgery_rate            NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_counsel_rate            NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_counsel_rate_oneday     NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_counsel_rate_general    NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_general_book_rate       NUMERIC(6,1)     NOT NULL DEFAULT 0,
    cataract_exam_count            INTEGER          NOT NULL DEFAULT 0,
    cataract_surgery_booked        INTEGER          NOT NULL DEFAULT 0,
    cataract_stopped_count         INTEGER          NOT NULL DEFAULT 0,
    cataract_surgery_rate          NUMERIC(6,1)     NOT NULL DEFAULT 0,
    loaded_at                      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);

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

CREATE TABLE IF NOT EXISTS mart_reservation_rate_monthly (
    yr                     SMALLINT       NOT NULL,
    mo                     SMALLINT       NOT NULL,
    category               VARCHAR(16)    NOT NULL,       -- 'vision' | 'cataract'
    exam_count             INTEGER        NOT NULL DEFAULT 0,
    surgery_booked_count   INTEGER        NOT NULL DEFAULT 0,
    reservation_rate       NUMERIC(6,1)   NOT NULL DEFAULT 0,
    loaded_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo, category)
);


-- =========================================================
-- V6 — 외래 도메인
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_outpatient_count_monthly (
    yr                SMALLINT    NOT NULL,
    mo                SMALLINT    NOT NULL,
    outpatient_count  INTEGER     NULL,
    total             INTEGER     NULL,
    loaded_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- =========================================================
-- V7 — 주간 검사자 종합지표
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


-- =========================================================
-- V8 — B2B 매출
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_b2b_revenue_monthly (
    yr                      SMALLINT     NOT NULL,
    mo                      SMALLINT     NOT NULL,
    total_revenue           INTEGER      NOT NULL DEFAULT 0,
    case_count              INTEGER      NOT NULL DEFAULT 0,
    avg_revenue_per_case    INTEGER      NOT NULL DEFAULT 0,
    vision_revenue          INTEGER      NOT NULL DEFAULT 0,
    cataract_revenue        INTEGER      NOT NULL DEFAULT 0,
    vision_count            INTEGER      NOT NULL DEFAULT 0,
    cataract_count          INTEGER      NOT NULL DEFAULT 0,
    designated_revenue      INTEGER      NOT NULL DEFAULT 0,
    non_designated_revenue  INTEGER      NOT NULL DEFAULT 0,
    designated_count        INTEGER      NOT NULL DEFAULT 0,
    non_designated_count    INTEGER      NOT NULL DEFAULT 0,
    op_cost                 INTEGER      NOT NULL DEFAULT 0,
    exam_cost               INTEGER      NOT NULL DEFAULT 0,
    dna_cost                INTEGER      NOT NULL DEFAULT 0,
    prp_cost                INTEGER      NOT NULL DEFAULT 0,
    etc_cost                INTEGER      NOT NULL DEFAULT 0,
    presbyopia_cost         INTEGER      NOT NULL DEFAULT 0,
    hospital_supply_cost    INTEGER      NOT NULL DEFAULT 0,
    loaded_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- =========================================================
-- V10 — 월별 검사자 종합지표
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


-- =========================================================
-- V11 — 예약통계 일별 (시력교정·백내장) + 잠금·수기보정
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_reservation_stats_system_daily (
    stat_date                  DATE         PRIMARY KEY,
    period                     CHAR(7)      NOT NULL,       -- YYYY-MM
    inbound_call               INTEGER      NOT NULL DEFAULT 0,   -- CH01
    answered_call              INTEGER      NOT NULL DEFAULT 0,   -- CH02
    new_inquiry                INTEGER      NOT NULL DEFAULT 0,   -- CH03
    call_reservation           INTEGER      NOT NULL DEFAULT 0,   -- CH04
    tm_total_db                INTEGER      NOT NULL DEFAULT 0,   -- CH05
    tm_valid_db                INTEGER      NOT NULL DEFAULT 0,   -- CH06
    tm_reservation             INTEGER      NOT NULL DEFAULT 0,   -- CH07
    tm_recounsel               INTEGER      NOT NULL DEFAULT 0,   -- CH08
    tm_recounsel_valid         INTEGER      NOT NULL DEFAULT 0,   -- CH09
    tm_recounsel_reservation   INTEGER      NOT NULL DEFAULT 0,   -- CH10
    home_received              INTEGER      NOT NULL DEFAULT 0,   -- CH11
    home_reservation           INTEGER      NOT NULL DEFAULT 0,   -- CH12
    naver_received             INTEGER      NOT NULL DEFAULT 0,   -- CH13
    naver_rejected             INTEGER      NOT NULL DEFAULT 0,   -- CH14
    naver_valid                INTEGER      NOT NULL DEFAULT 0,   -- CH15
    naver_reservation          INTEGER      NOT NULL DEFAULT 0,   -- CH16
    kakao_inquiry              INTEGER      NOT NULL DEFAULT 0,   -- CH17
    kakao_reservation          INTEGER      NOT NULL DEFAULT 0,   -- CH18
    cancel_call_naver          INTEGER      NOT NULL DEFAULT 0,   -- CH19
    cancel_home                INTEGER      NOT NULL DEFAULT 0,   -- CH20
    cancel_kakao               INTEGER      NOT NULL DEFAULT 0,   -- CH21
    visit                      INTEGER      NOT NULL DEFAULT 0,   -- CH22
    no_show_reservation        INTEGER      NOT NULL DEFAULT 0,   -- CH23
    cancel                     INTEGER      NOT NULL DEFAULT 0,   -- CH24
    loaded_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mart_reservation_stats_system_daily_period
    ON mart_reservation_stats_system_daily (period);

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

CREATE TABLE IF NOT EXISTS reservation_stats_period_lock (
    product_type   VARCHAR(16)   NOT NULL,        -- 'SYSTEM' | 'CATARACT'
    period         CHAR(7)       NOT NULL,        -- YYYY-MM
    locked_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_by      VARCHAR(64)   NOT NULL,
    PRIMARY KEY (product_type, period)
);

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


-- =========================================================
-- V12 — 예약 종합(콜·온라인) 월별
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_reservation_overall_monthly (
    yr           SMALLINT    NOT NULL,
    mo           SMALLINT    NOT NULL,
    reservations INTEGER     NULL,       -- 콜 + 온라인
    online       INTEGER     NULL,       -- 홈페이지/앱 + 네이버
    call_count   INTEGER     NULL,       -- 인콜 + 아웃콜 (SQL 예약어 회피용 이름)
    total        INTEGER     NULL,
    loaded_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- =========================================================
-- V21 — 예약자 리스트_홈페이지 (레거시 MariaDB 소스)
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_list_reservation_homepage (
    id              BIGSERIAL     PRIMARY KEY,
    legacy_no       VARCHAR(20)   NOT NULL,
    device_type     VARCHAR(32)   NOT NULL DEFAULT '',    -- 원본 DIVICE_TYPE (오타 유지)
    name            VARCHAR(100)  NOT NULL DEFAULT '',
    phone           VARCHAR(32)   NOT NULL DEFAULT '',
    reserve_date    VARCHAR(16)   NOT NULL DEFAULT '',
    reserve_time    VARCHAR(16)   NOT NULL DEFAULT '',
    utm_source      VARCHAR(64)   NOT NULL DEFAULT '',
    utm_medium      VARCHAR(64)   NOT NULL DEFAULT '',
    utm_campaign    VARCHAR(128)  NOT NULL DEFAULT '',
    referral_code   VARCHAR(32)   NOT NULL DEFAULT '',
    exam_type       VARCHAR(8)    NOT NULL DEFAULT '',    -- 5=시력교정, 2=백내장, 21=노안, 24/25=렌즈
    surgery_tf      VARCHAR(2)    NOT NULL DEFAULT '',
    is_reserve      VARCHAR(8)    NOT NULL DEFAULT '',
    reg_date        TIMESTAMP     NOT NULL,
    loaded_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mart_list_reservation_homepage_reg_date
    ON mart_list_reservation_homepage (reg_date);

CREATE INDEX IF NOT EXISTS idx_mart_list_reservation_homepage_exam_type_reg
    ON mart_list_reservation_homepage (exam_type, reg_date);


-- =========================================================
-- V25 — 외래수 리스트 마트
-- 원본 SQL: sql/outpatient/find-outpatient-list.sql
-- 예약일(RESERVE_DATE) 기준. 행 1개 = RESERVATION 1건. delete+insert 패턴.
-- 리스트 합계 = 월별 외래수 지표(mart_outpatient_count_monthly)와 정합.
-- =========================================================

CREATE TABLE IF NOT EXISTS list_outpatient (
    id                      BIGSERIAL     PRIMARY KEY,
    reserve_date            DATE          NOT NULL,
    reserve_num             VARCHAR(30)   NOT NULL DEFAULT '',
    reserve_time            VARCHAR(10)   NOT NULL DEFAULT '',
    end_time                VARCHAR(10)   NOT NULL DEFAULT '',
    state                   VARCHAR(10)   NOT NULL DEFAULT '',   -- '내원' | '퇴원'
    state_code              VARCHAR(4)    NOT NULL DEFAULT '',   -- 'I' | 'H'
    reserve_type            VARCHAR(100)  NOT NULL DEFAULT '',   -- MEDICAL_SUB_CFG.SUB_NAME
    reserve_jinryo_code     VARCHAR(10)   NOT NULL DEFAULT '',
    patient_type            VARCHAR(20)   NOT NULL DEFAULT '',   -- '신환' | '구환'
    old_flag                VARCHAR(4)    NOT NULL DEFAULT '',
    today_flag              VARCHAR(4)    NOT NULL DEFAULT '',
    happy_call              VARCHAR(4)    NOT NULL DEFAULT '',
    chart_no                VARCHAR(50)   NOT NULL DEFAULT '',
    name                    VARCHAR(100)  NOT NULL DEFAULT '',
    name_eng                VARCHAR(200)  NOT NULL DEFAULT '',
    grade                   VARCHAR(20)   NOT NULL DEFAULT '',
    birth                   VARCHAR(20)   NOT NULL DEFAULT '',
    lunar                   VARCHAR(4)    NOT NULL DEFAULT '',
    phone1                  VARCHAR(30)   NOT NULL DEFAULT '',
    phone2                  VARCHAR(30)   NOT NULL DEFAULT '',
    email                   VARCHAR(200)  NOT NULL DEFAULT '',
    zip                     VARCHAR(20)   NOT NULL DEFAULT '',
    addr1                   VARCHAR(500)  NOT NULL DEFAULT '',
    addr2                   VARCHAR(500)  NOT NULL DEFAULT '',
    doctor                  VARCHAR(100)  NOT NULL DEFAULT '',
    counselor               VARCHAR(100)  NOT NULL DEFAULT '',
    registered_by           VARCHAR(100)  NOT NULL DEFAULT '',
    comment                 TEXT          NOT NULL DEFAULT '',
    route                   VARCHAR(30)   NOT NULL DEFAULT '',
    section                 VARCHAR(30)   NOT NULL DEFAULT '',
    motive_l                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_m                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_s                VARCHAR(100)  NOT NULL DEFAULT '',
    motive_memo             TEXT          NOT NULL DEFAULT '',
    job                     VARCHAR(100)  NOT NULL DEFAULT '',
    last_visit              VARCHAR(20)   NOT NULL DEFAULT '',
    insurance               VARCHAR(100)  NOT NULL DEFAULT '',
    nationality             VARCHAR(100)  NOT NULL DEFAULT '',
    memo                    TEXT          NOT NULL DEFAULT '',
    loaded_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_outpatient_reserve_date
    ON list_outpatient (reserve_date);

CREATE INDEX IF NOT EXISTS idx_list_outpatient_chart
    ON list_outpatient (chart_no);
