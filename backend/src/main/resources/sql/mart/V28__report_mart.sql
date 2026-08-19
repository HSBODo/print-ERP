-- =========================================================
-- 레포트 마트 (V28)
-- Profile: postgres-mart
--
-- 두 테이블 모두 "화면이 MSSQL 에 직접 붙지 않게" 하려고 만든다.
-- 종전에는 주차 레포트·고객분류별 검사수만 statsJdbcTemplate(MSSQL 직결)로 조회해서
-- VPN/SSH 터널이 끊기면 그 화면만 503 이 됐다. 배치가 적재하고 화면은 마트를 읽는
-- 다른 도메인과 같은 구조로 맞춘다.
--
--   mart_weekly_report      — ISO 8601 연간 주차(월~일, 첫 목요일이 든 주 = 1주차) 원시 집계
--                             원본: WeeklyReportService (sql/report/*.sql 일별 6종)
--                             PK (yr, wk). 1주차가 전년 12월을 물어도 ISO 주차연도로 귀속.
--   mart_exam_count_by_class — (월 × 내원동기(레포트) 9계열) 검사수(세션 기준)
--                             원본: sql/exam/find-exam-count-by-class-monthly.sql
--                             PK (yr, mo, motive_report).
--
-- 값이 NULL 이면 "그 주에는 알 수 없음"(예: 홈페이지 소스 미연결 구간의 온라인 예약)이고
-- 0 과 구분해야 하므로 컬럼에 NOT NULL 을 걸지 않는다. WeeklyReportItem 의 Integer 와 짝.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_weekly_report (
    yr                  INT           NOT NULL,
    wk                  INT           NOT NULL,
    start_date          DATE          NOT NULL,
    end_date            DATE          NOT NULL,

    -- 예약 (등록일 기준)
    reservations        INT,
    call_cnt            INT,
    online              INT,

    -- 검사 유입
    intro_general       INT,
    intro_customer      INT,
    intro_staff         INT,
    job_office          INT,
    job_student         INT,
    job_etc             INT,

    -- 검사수
    exam_total          INT,
    vision_exam         INT,
    cataract_exam       INT,
    one_day             INT,

    -- 비율 계산용 원시값
    -- cataract_exam_eyes 는 V54 에서 삭제됨 — 백내장 예약률을 사람 단위로 통일(cataract_exam 분모).
    vision_booked       INT,
    cataract_booked     INT,
    one_day_booked      INT,
    stop_count          INT,
    exam_general_base   INT,
    booked_general      INT,

    -- 수술 (수술일 기준)
    vision_surgery      INT,
    cataract_surgery    INT,
    total_surgery       INT,

    -- 외래
    outpatient          INT,

    loaded_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, wk)
);

CREATE INDEX IF NOT EXISTS idx_mart_weekly_report_yr ON mart_weekly_report (yr);

-- 내원동기(레포트) 9계열: B2B(군인)·B2B(기업)·소개고객·소개직원·광고·홈페이지·바이럴·프로모션·기타
CREATE TABLE IF NOT EXISTS mart_exam_count_by_class (
    yr             INT           NOT NULL,
    mo             INT           NOT NULL,
    motive_report  VARCHAR(40)   NOT NULL,
    cnt            INT           NOT NULL DEFAULT 0,
    loaded_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo, motive_report)
);

CREATE INDEX IF NOT EXISTS idx_mart_exam_count_by_class_yr ON mart_exam_count_by_class (yr);
