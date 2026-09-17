-- =========================================================
-- 회계 · 진료 매출 월별 집계 마트 (V67b)
-- Profile: postgres-mart
--
-- 원본 SQL: sql/iplus/accounting/select-medical-monthly-inner.sql
--   의사랑(IPLUS) 외래·입원 수납 원장 + PAYTRANS + NHICM4AP 를 월별로 접은 값. 2023년부터.
--   list_medical_receipt 가 없는 2023~2025 의 진료 매출 그래프는 이 표만 읽는다.
--   행 1개 = (yr, mo). 배치는 from..to 가 걸친 달을 통째로 다시 계산해 upsert 한다.
--
-- net(실수납합계 · 레거시 공식) = copay_due + outstanding_recovered − outstanding_new − refund − health_living + refund_occurred
--   구성 항목을 따로 두는 이유: 공식이 바뀌어도 원천을 다시 안 읽고 재계산할 수 있게.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_medical_receipt_monthly (
    yr                    INT     NOT NULL,
    mo                    INT     NOT NULL,
    receipt_count         INT     NOT NULL DEFAULT 0,   -- 외래 + 입원 원장 행수
    copay_due             BIGINT  NOT NULL DEFAULT 0,   -- 수납할금액(총본인부담) 합
    claim_amount          BIGINT  NOT NULL DEFAULT 0,   -- 청구액(공단청구액) 합
    salary_total          BIGINT  NOT NULL DEFAULT 0,   -- 급여총액 합
    non_covered           BIGINT  NOT NULL DEFAULT 0,   -- 비급여액 합
    discount              BIGINT  NOT NULL DEFAULT 0,   -- 할인액 합
    outstanding_recovered BIGINT  NOT NULL DEFAULT 0,   -- 미수회수 (PAYTRANS 91·92·93)
    refund                BIGINT  NOT NULL DEFAULT 0,   -- 환불금 (PAYTRANS 81·82)
    outstanding_new       BIGINT  NOT NULL DEFAULT 0,   -- 미수발생 (PAYTRANS 90)
    refund_occurred       BIGINT  NOT NULL DEFAULT 0,   -- 환불발생 (PAYTRANS 80 · 진료일자)
    health_living         BIGINT  NOT NULL DEFAULT 0,   -- 건생비 (NHICM4AP)
    net                   BIGINT  NOT NULL DEFAULT 0,   -- 실수납합계 (위 공식)
    loaded_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
