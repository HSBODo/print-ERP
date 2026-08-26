-- =========================================================
-- 월별 검사수 마트 (V4b) — ProcedureExamMonthlyItem
-- Profile: postgres-mart
--
-- 원본 서비스: ProcedureExamStatsService.getMonthlyStats(years)
--   examCount       = EXAM 행수 + Cataract_Exam 세션수 (raw COUNT)
--   oneDayExamCount = EXAM 기준 검사OP(M/5) 내원 (중단/취소 제외)
-- 2024·2025는 레거시 확정값 사용. 2026+ prod DB 계산값.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_procedure_exam_monthly (
    yr                     SMALLINT    NOT NULL,
    mo                     SMALLINT    NOT NULL,
    exam_count             INTEGER     NOT NULL DEFAULT 0,
    one_day_exam_count     INTEGER     NOT NULL DEFAULT 0,
    total                  INTEGER     NOT NULL DEFAULT 0,
    loaded_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
