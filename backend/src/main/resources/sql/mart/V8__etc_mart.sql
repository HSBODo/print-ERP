-- =========================================================
-- 기타 도메인 마트 (V8) — PR-14
-- Profile: postgres-mart
--
-- 한 개 테이블 (etc 도메인은 현재 B2B 매출만 존재):
--   mart_b2b_revenue_monthly — B2B(기업) 매출 월별 (B2bRevenueMonthlyItem)
--
-- 총매출 = 수술비 + 검사비 + DNA + PRP + 기타/약 + 노안 + 병원물품 (7개 수가 합산).
-- 서비스가 계산한 값을 그대로 저장 (avgRevenuePerCase 등 파생값 포함).
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_b2b_revenue_monthly (
    yr                      SMALLINT     NOT NULL,
    mo                      SMALLINT     NOT NULL,
    total_revenue           INTEGER      NOT NULL DEFAULT 0,
    case_count              INTEGER      NOT NULL DEFAULT 0,
    avg_revenue_per_case    INTEGER      NOT NULL DEFAULT 0,
    vision_revenue          INTEGER      NOT NULL DEFAULT 0,
    cataract_revenue        INTEGER      NOT NULL DEFAULT 0,
    vision_count            INTEGER      NOT NULL DEFAULT 0,
    cataract_count          INTEGER      NOT NULL DEFAULT 0,
    designated_revenue      INTEGER      NOT NULL DEFAULT 0,
    non_designated_revenue  INTEGER      NOT NULL DEFAULT 0,
    designated_count        INTEGER      NOT NULL DEFAULT 0,
    non_designated_count    INTEGER      NOT NULL DEFAULT 0,
    op_cost                 INTEGER      NOT NULL DEFAULT 0,
    exam_cost               INTEGER      NOT NULL DEFAULT 0,
    dna_cost                INTEGER      NOT NULL DEFAULT 0,
    prp_cost                INTEGER      NOT NULL DEFAULT 0,
    etc_cost                INTEGER      NOT NULL DEFAULT 0,
    presbyopia_cost         INTEGER      NOT NULL DEFAULT 0,
    hospital_supply_cost    INTEGER      NOT NULL DEFAULT 0,
    loaded_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
