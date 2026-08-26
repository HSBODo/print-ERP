-- =========================================================
-- 백내장 검사자 명단 마트 (V4d)
-- Profile: postgres-mart
--
-- 원본 SQL: sql/softcrm/exam/select-cataract-exam-list.sql
--   Cataract_Exam.EXAM_DATE 기준. list_exam와 동일 49필드 계약(examCategory 리터럴 '백내장').
-- =========================================================

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
    -- 백내장 리스트 분류 (V23 통합) — 백내장/중단/노안·FU/기타. v_all_exam_list.cataract_class 파생.
    classification          VARCHAR(20)   NOT NULL DEFAULT '',
    -- 원데이 판정 (V32 통합) — 진료구분 C_원데이·C_노안원데이. exam_type 파생에 사용.
    one_day                 VARCHAR(4)    NOT NULL DEFAULT 'N',
    loaded_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_cataract_exam_exam_date
    ON list_cataract_exam (exam_date);

CREATE INDEX IF NOT EXISTS idx_list_cataract_exam_chart
    ON list_cataract_exam (chart_no);
