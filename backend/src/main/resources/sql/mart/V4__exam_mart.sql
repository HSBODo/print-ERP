-- =========================================================
-- 검사 도메인 마트 (V4) — PR-6
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 네 개 테이블:
--   mart_examination_monthly     — 월별 시력교정/드림렌즈/백내장 (ExaminationMonthlyItem)
--   mart_procedure_exam_monthly  — 월별 검사수/원데이 검사수 (ProcedureExamMonthlyItem)
--   list_exam                    — 시력교정 검사자 명단 행 (find-exam-list.sql 출력 shape)
--   list_cataract_exam           — 백내장 검사자 명단 행 (find-cataract-exam-list.sql 출력 shape)
-- =========================================================

-- ─── 월별 검사통계 마트 (examination) ─────────────────────
-- 원본 서비스: ExaminationStatsService.getMonthlyStats(years)
--   visionCorrection = 시력교정(2024·2025는 레거시 확정값, 이후 EXAM 기준)
--   dreamlens        = 드림렌즈(EXAM 리스트 D만 있고 M 없는 행)
--   cataract         = 백내장(2024·2025 레거시, 이후 눈 단위)
--   examTotal, total = visionCorrection + dreamlens + cataract
-- 레거시 보정치가 적용된 값을 그대로 저장(현재 UI 값과 동일).
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


-- ─── 월별 검사수 마트 (procedure-exam) ────────────────────
-- 원본 서비스: ProcedureExamStatsService.getMonthlyStats(years)
--   examCount       = EXAM 행수 + Cataract_Exam 세션수 (raw COUNT)
--   oneDayExamCount = EXAM 기준 검사OP(M/5) 내원 (중단/취소 제외)
-- 2024·2025는 레거시 확정값 사용. 2026+ prod DB 계산값.
CREATE TABLE IF NOT EXISTS mart_procedure_exam_monthly (
    yr                     SMALLINT    NOT NULL,
    mo                     SMALLINT    NOT NULL,
    exam_count             INTEGER     NOT NULL DEFAULT 0,
    one_day_exam_count     INTEGER     NOT NULL DEFAULT 0,
    total                  INTEGER     NOT NULL DEFAULT 0,
    loaded_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- ─── 시력교정 검사자 명단 마트 ────────────────────────────
-- 원본 SQL: sql/exam/find-exam-list.sql
--   검사일(EXAM.EXAM_DATE) 기준. 행 1개 = EXAM 1건. delete+insert 패턴.
--   ISNULL(...,'')로 감싸 항상 문자열. jumin은 PII 정책상 빈 문자열.
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

CREATE INDEX IF NOT EXISTS idx_list_exam_exam_date
    ON list_exam (exam_date);

CREATE INDEX IF NOT EXISTS idx_list_exam_chart
    ON list_exam (chart_no);


-- ─── 백내장 검사자 명단 마트 ──────────────────────────────
-- 원본 SQL: sql/exam/find-cataract-exam-list.sql
--   Cataract_Exam.EXAM_DATE 기준. list_exam와 동일 49필드 계약(examCategory 리터럴 '백내장').
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
    loaded_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_cataract_exam_exam_date
    ON list_cataract_exam (exam_date);

CREATE INDEX IF NOT EXISTS idx_list_cataract_exam_chart
    ON list_cataract_exam (chart_no);
