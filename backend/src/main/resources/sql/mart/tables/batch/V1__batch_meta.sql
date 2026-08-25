-- =========================================================
-- Postgres 마트 메타 테이블 (V1)
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.3
--
-- 여러 인스턴스가 동시에 기동해도 안전하도록 IF NOT EXISTS 사용.
-- 정식 마이그레이션 도구(Flyway/Liquibase) 도입 전까지 애플리케이션
-- 시작 시 MartSchemaInitializer가 실행한다.
-- =========================================================

-- 배치 실행 이력
-- 각 잡의 성공/실패, 처리 건수, 소요 시간, 대상 기간을 기록한다.
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


-- 마트별 워터마크 (마지막으로 성공적으로 적재된 날짜)
-- 다음 daily append 실행 시 이 값 + 1일 ~ 어제까지의 데이터를 가져온다.
-- 최초 실행 시 워터마크가 없으면 잡의 기본 시작일(코드에 정의)을 사용.
CREATE TABLE IF NOT EXISTS batch_watermark (
    mart_name       VARCHAR(100)    PRIMARY KEY,
    last_loaded_at  DATE            NOT NULL,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
