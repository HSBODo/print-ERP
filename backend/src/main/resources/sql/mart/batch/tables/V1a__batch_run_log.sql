-- =========================================================
-- 배치 실행 이력 (V1a)
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.3
--
-- 각 잡의 성공/실패, 처리 건수, 소요 시간, 대상 기간을 기록한다.
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
    -- 잡별 (테이블→행수) 상세. 어떤 파일이 얼마나 썼는지 관리자 화면에서 펼쳐 볼 때 사용.
    table_stats     JSONB
);

CREATE INDEX IF NOT EXISTS idx_batch_run_log_job_started
    ON batch_run_log (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_batch_run_log_status
    ON batch_run_log (status);
