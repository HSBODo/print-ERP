-- =========================================================
-- 예약통계 셀 수기 보정 이력 (V11d)
-- Profile: postgres-mart
--
-- INSERT-only 감사 로그. 조회 시 (product_type, stat_date, field_name) 기준
-- 최신(created_at DESC) 1건을 원본 카운트 위에 얹어 응답.
-- 배치는 이 테이블과 무관 — override 는 항상 원본과 분리되어 보존됨.
-- =========================================================

CREATE TABLE IF NOT EXISTS reservation_stats_override (
    id              BIGSERIAL     PRIMARY KEY,
    product_type    VARCHAR(16)   NOT NULL,
    stat_date       DATE          NOT NULL,
    field_name      VARCHAR(64)   NOT NULL,
    override_value  INTEGER       NOT NULL,
    reason          TEXT,
    created_by      VARCHAR(64)   NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservation_stats_override_lookup
    ON reservation_stats_override (product_type, stat_date, field_name, created_at DESC);
