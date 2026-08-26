-- =========================================================
-- 수술자 리스트 마트 (V2c)
-- Profile: postgres-mart
--
-- 원본 select-surgery-list.sql 출력 컬럼(42개)을 그대로 저장.
-- (cust_num, surgery_date, surgery_category)가 사실상 유일하지만 안전을 위해
-- BIGSERIAL id를 PK로 두고 조회용 인덱스만 걸어둔다. delete+insert 패턴이라
-- 유일성 위반 우려는 배치 로직이 담보.
-- =========================================================

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
