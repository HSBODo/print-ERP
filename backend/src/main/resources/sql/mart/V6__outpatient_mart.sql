-- =========================================================
-- 외래 도메인 마트 (V6) — PR-10
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1
--
-- 한 개 테이블:
--   mart_outpatient_count_monthly — 외래수 월별 (OutpatientCountMonthlyItem)
--
-- 특이사항: outpatient_count/total은 nullable — 2026 미확인 월(레거시 미보유 + DB 미산출)은 NULL 저장.
-- 서비스 계약 상 Integer(nullable)이라 마트도 NULL 허용해 원본 응답을 재현한다.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_outpatient_count_monthly (
    yr                SMALLINT    NOT NULL,
    mo                SMALLINT    NOT NULL,
    outpatient_count  INTEGER     NULL,
    total             INTEGER     NULL,
    loaded_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
