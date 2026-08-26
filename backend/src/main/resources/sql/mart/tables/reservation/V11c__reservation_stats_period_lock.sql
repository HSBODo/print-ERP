-- =========================================================
-- 월 확정(잠금) 상태 (V11c)
-- Profile: postgres-mart
--
-- 확정된 월은 배치가 덮어쓰지 못하도록 배치 잡이 이 테이블을 확인 후 필터링.
-- product_type: 'SYSTEM' | 'CATARACT'
-- =========================================================

CREATE TABLE IF NOT EXISTS reservation_stats_period_lock (
    product_type   VARCHAR(16)   NOT NULL,
    period         CHAR(7)       NOT NULL,
    locked_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_by      VARCHAR(64)   NOT NULL,
    PRIMARY KEY (product_type, period)
);
