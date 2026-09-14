-- =========================================================
-- 고객분류(내원동기)별 검사수 마트 (V28b)
-- Profile: postgres-mart
--
-- (월 × 내원동기(레포트) 9계열) 검사수(세션 기준).
-- 원본: sql/softcrm/exam/select-exam-count-by-class-monthly.sql
-- PK (yr, mo, motive_report).
-- 내원동기(레포트) 9계열: B2B(군인)·B2B(기업)·소개고객·소개직원·광고·홈페이지·바이럴·프로모션·기타
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_exam_count_by_class (
    yr             INT           NOT NULL,
    mo             INT           NOT NULL,
    motive_report  VARCHAR(40)   NOT NULL,
    cnt            INT           NOT NULL DEFAULT 0,
    loaded_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo, motive_report)
);

CREATE INDEX IF NOT EXISTS idx_mart_exam_count_by_class_yr ON mart_exam_count_by_class (yr);
