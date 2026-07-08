-- =========================================================
-- 수술 도메인 마트 (V2)
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 세 개 테이블:
--   mart_surgery_monthly  — 월별 집계 (SurgeryMonthlyItem)
--   mart_surgery_daily    — 일별 집계 (SurgeryDailyItem)
--   list_surgery          — 수술자 상세 행
-- =========================================================

-- ─── 월별 집계 마트 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mart_surgery_monthly (
    yr                  SMALLINT    NOT NULL,
    mo                  SMALLINT    NOT NULL,
    -- 시력교정
    lasek               INTEGER     NOT NULL DEFAULT 0,
    lasik               INTEGER     NOT NULL DEFAULT 0,
    smile               INTEGER     NOT NULL DEFAULT 0,
    smile_pro           INTEGER     NOT NULL DEFAULT 0,
    -- 렌즈/각막
    icl                 INTEGER     NOT NULL DEFAULT 0,
    t_icl               INTEGER     NOT NULL DEFAULT 0,
    kpl                 INTEGER     NOT NULL DEFAULT 0,
    t_kpl               INTEGER     NOT NULL DEFAULT 0,
    viva                INTEGER     NOT NULL DEFAULT 0,
    -- 백내장
    cat_multi           INTEGER     NOT NULL DEFAULT 0,
    cat_mono            INTEGER     NOT NULL DEFAULT 0,
    cat_edof            INTEGER     NOT NULL DEFAULT 0,
    -- 시력교정 부가시술 (add-on)
    xtra                INTEGER     NOT NULL DEFAULT 0,
    wave_vision         INTEGER     NOT NULL DEFAULT 0,
    mono_vision         INTEGER     NOT NULL DEFAULT 0,
    contra              INTEGER     NOT NULL DEFAULT 0,
    personal            INTEGER     NOT NULL DEFAULT 0,
    -- 라섹계 세부 (EYECLE)
    lasek_ex            INTEGER     NOT NULL DEFAULT 0,
    lasek_red           INTEGER     NOT NULL DEFAULT 0,
    -- 재수술
    reoperation         INTEGER     NOT NULL DEFAULT 0,
    reop_laser          INTEGER     NOT NULL DEFAULT 0,
    reop_lens           INTEGER     NOT NULL DEFAULT 0,
    -- 그룹별 환자 수 및 합계
    vision_patients     INTEGER     NOT NULL DEFAULT 0,
    cataract_patients   INTEGER     NOT NULL DEFAULT 0,
    total               INTEGER     NOT NULL DEFAULT 0,
    -- 감사
    loaded_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- ─── 일별 집계 마트 ───────────────────────────────────────
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


-- ─── 수술자 리스트 마트 ───────────────────────────────────
-- 원본 find-surgery-list.sql 출력 컬럼(42개)을 그대로 저장.
-- (cust_num, surgery_date, surgery_category)가 사실상 유일하지만 안전을 위해
-- BIGSERIAL id를 PK로 두고 조회용 인덱스만 걸어둔다. delete+insert 패턴이라
-- 유일성 위반 우려는 배치 로직이 담보.
CREATE TABLE IF NOT EXISTS list_surgery (
    id                    BIGSERIAL     PRIMARY KEY,
    chart_no              VARCHAR(50),
    name                  VARCHAR(100),
    name_eng              VARCHAR(100),
    surgery_category      VARCHAR(20)   NOT NULL,   -- '시력교정' | '백내장'
    surgery_date          DATE          NOT NULL,
    exam_date             DATE,
    patient_type          VARCHAR(10),              -- '신환' | '구환'
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
    lunar                 VARCHAR(4),               -- '음' | '양'
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

CREATE INDEX IF NOT EXISTS idx_list_surgery_date
    ON list_surgery (surgery_date);

CREATE INDEX IF NOT EXISTS idx_list_surgery_cust
    ON list_surgery (chart_no);

CREATE INDEX IF NOT EXISTS idx_list_surgery_date_category
    ON list_surgery (surgery_date, surgery_category);
