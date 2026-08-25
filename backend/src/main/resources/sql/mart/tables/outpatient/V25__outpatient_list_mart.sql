-- =========================================================
-- 외래수 리스트 마트 (V25)
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 하나의 테이블:
--   list_outpatient — 외래 예약(F) + 내원/퇴원(I/H) 행 (find-outpatient-list.sql 출력 shape)
--   원본 SQL: sql/outpatient/find-outpatient-list.sql
--   예약일(RESERVE_DATE) 기준. 행 1개 = RESERVATION 1건. delete+insert 패턴.
--   리스트 합계 = 월별 외래수 지표(mart_outpatient_count_monthly)와 정합.
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
