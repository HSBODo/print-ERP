-- =========================================================
-- 회계 · 진료 수납 내역 마트 (V67a)
-- Profile: postgres-mart
--
-- 원본 SQL: sql/iplus/accounting/select-medical-receipts-inner.sql
--   의사랑(IPLUS · 링크드서버 [220.85.109.240]) 외래(PAOSUNAB_New)·입원(PAISUNAB_New) 수납 원장을
--   수납일 기준으로 행 그대로 싣는다. 2026-01-01 이후만(_New 체계 · 백대백 항목). 그 전 연도는
--   mart_medical_receipt_monthly(월집계) 로만 본다.
--   행 1개 = 원장 1행. (수납일자, 차트번호, 일련번호) 가 다건일 수 있어 자연키가 없다 → 수납일 범위 delete+insert.
--   row_seq 는 배치 한 번 안에서의 순번(정렬 안정용) 이며 재적재마다 바뀔 수 있다.
--
-- 실수납합계(화면 계산) = 일련번호 98(환불금) 이면 −refund, 아니면 actual_paid + outstanding_recovered.
-- 카드/현금/통장 수납(화면) = card + outstanding_card 처럼 미수 회수분을 더해 보여준다.
-- =========================================================

CREATE TABLE IF NOT EXISTS list_medical_receipt (
    id                    BIGSERIAL     PRIMARY KEY,
    receipt_date          DATE          NOT NULL,                    -- 수납일자(외래) / 입원일자(입원)
    receipt_type          VARCHAR(8)    NOT NULL DEFAULT '',         -- 외래 / 입원 (수납구분)
    chart_no              VARCHAR(20)   NOT NULL DEFAULT '',
    serial_no             INT           NOT NULL DEFAULT 0,          -- 일련번호 (99 미수입금 · 98 환불금 · 입원 0)
    row_seq               INT           NOT NULL DEFAULT 0,
    patient_name          VARCHAR(100)  NOT NULL DEFAULT '',
    insurance_type        VARCHAR(30)   NOT NULL DEFAULT '',         -- 보험유형 (SETKIND.KINDNAME · 미수입금 · 환불금)
    doctor                VARCHAR(50)   NOT NULL DEFAULT '',
    receipt_staff         VARCHAR(50)   NOT NULL DEFAULT '',
    receipt_time          VARCHAR(5)    NOT NULL DEFAULT '',         -- HH:MM
    room                  VARCHAR(50)   NOT NULL DEFAULT '',         -- 진료실 (외래만)
    revenue_type          VARCHAR(10)   NOT NULL DEFAULT '',         -- 매출구분: 입원 / 입원외 / 기타외래
    status                INT           NOT NULL DEFAULT 1,          -- 1 정상 · 그 외 취소
    closed                INT           NOT NULL DEFAULT 0,          -- 마감여부 1 = 마감
    hundred_copay         BIGINT        NOT NULL DEFAULT 0,          -- 백대백본 (전액본인부담)
    hundred_unpaid        BIGINT        NOT NULL DEFAULT 0,          -- 백대백미 (백대백미만본인부담)
    salary_total          BIGINT        NOT NULL DEFAULT 0,          -- 급여총액
    claim_amount          BIGINT        NOT NULL DEFAULT 0,          -- 청구액
    copay                 BIGINT        NOT NULL DEFAULT 0,          -- 본인부담
    non_covered           BIGINT        NOT NULL DEFAULT 0,          -- 비급여②
    total_copay           BIGINT        NOT NULL DEFAULT 0,          -- 총본인부담 (수납할금액)
    welfare_support       BIGINT        NOT NULL DEFAULT 0,          -- 복지지원
    disabled_support      BIGINT        NOT NULL DEFAULT 0,          -- 장애인진
    support_amount        BIGINT        NOT NULL DEFAULT 0,          -- 지원금
    health_living_expense BIGINT        NOT NULL DEFAULT 0,          -- 건생비 (NHICM4AP)
    actual_paid           BIGINT        NOT NULL DEFAULT 0,          -- 실수납액
    outstanding           BIGINT        NOT NULL DEFAULT 0,          -- 미수금
    discount              BIGINT        NOT NULL DEFAULT 0,
    discount_reason       TEXT          NOT NULL DEFAULT '',
    card                  BIGINT        NOT NULL DEFAULT 0,
    cash                  BIGINT        NOT NULL DEFAULT 0,
    transfer              BIGINT        NOT NULL DEFAULT 0,          -- 통장수납
    refund                BIGINT        NOT NULL DEFAULT 0,          -- 환불액 (PAYTRANS 81·82)
    outstanding_occurred  BIGINT        NOT NULL DEFAULT 0,          -- 미수발생 (PAYTRANS 90)
    outstanding_recovered BIGINT        NOT NULL DEFAULT 0,          -- 미수회수 (PAYTRANS 91·92·93)
    outstanding_card      BIGINT        NOT NULL DEFAULT 0,          -- 미수카드 (91)
    outstanding_cash      BIGINT        NOT NULL DEFAULT 0,          -- 미수현금 (92)
    outstanding_transfer  BIGINT        NOT NULL DEFAULT 0,          -- 미수통장 (93)
    refund_occurred       BIGINT        NOT NULL DEFAULT 0,          -- 환불발생 (80 · 진료일자 기준)
    cash_receipt          BIGINT        NOT NULL DEFAULT 0,          -- 현금영수증 (RECEIPTCASH)
    loaded_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_medical_receipt_date
    ON list_medical_receipt (receipt_date);

CREATE INDEX IF NOT EXISTS idx_list_medical_receipt_chart
    ON list_medical_receipt (chart_no);
