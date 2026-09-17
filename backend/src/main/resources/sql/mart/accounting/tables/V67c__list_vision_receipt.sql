-- =========================================================
-- 회계 · 시력교정 매출 내역 마트 (V67c)
-- Profile: postgres-mart
--
-- 원본 SQL: sql/softcrm/accounting/select-vision-*.sql (CstPrcSub + PrcItmDtl + PrcItmLst + OPERATIONDATA)
--   SOFTCRM 비급여 수납 전표 상세 1줄(결제수단별) = 1행. 취소 전표(CstCnlYnN='Y') 는 원행(결제처리)과
--   취소행(결제취소 · 금액 음수) 두 줄로 실어 합계가 순액이 되게 한다. 2023-01-01 부터 전 기간 행으로 싣는다.
--   시력교정 매출 내역 · 매출 집계(피벗) · 매출 그래프 세 화면이 모두 이 표 하나를 읽는다(집계는 조회 시 GROUP BY).
--   자연키 (cust_num, seq, sub_seq, status) 이지만 원천 정정을 흡수하기 위해 수납일 범위 delete+insert.
--
-- item_amounts: 진료명 → 금액 JSON (키 = VisionItemCatalog.ITEMS 17종 고정 · 합 = amount 불변식).
-- taxable: 건기식·영양제 계열 7종 합 (과세) · exempt = amount − taxable.
-- =========================================================

CREATE TABLE IF NOT EXISTS list_vision_receipt (
    id               BIGSERIAL     PRIMARY KEY,
    receipt_date     DATE          NOT NULL,                    -- CstDte
    cust_num         VARCHAR(20)   NOT NULL DEFAULT '',
    seq              INT           NOT NULL DEFAULT 0,          -- CstSeq
    sub_seq          INT           NOT NULL DEFAULT 0,          -- CstSubSeq (분할결제 순번)
    status           VARCHAR(10)   NOT NULL DEFAULT '',         -- 결제처리 / 결제취소
    customer_name    VARCHAR(100)  NOT NULL DEFAULT '',
    customer_grade   VARCHAR(20)   NOT NULL DEFAULT '',
    surgery_date     VARCHAR(10)   NOT NULL DEFAULT '',         -- 수납일과 가장 가까운 수술 (없으면 '')
    surgeon          VARCHAR(50)   NOT NULL DEFAULT '',
    procedure_right  VARCHAR(100)  NOT NULL DEFAULT '',
    procedure_left   VARCHAR(100)  NOT NULL DEFAULT '',
    counselor        VARCHAR(50)   NOT NULL DEFAULT '',
    payment_method   VARCHAR(20)   NOT NULL DEFAULT '',         -- CstPayWay 원문 (카드 · 현금 · 현금영수 · 통장 …)
    card_company     VARCHAR(50)   NOT NULL DEFAULT '',         -- COST_CARDCP 원문
    acquirer         VARCHAR(50)   NOT NULL DEFAULT '',         -- 매입사 (코드 환산·별칭 적용)
    payment_mode     VARCHAR(10)   NOT NULL DEFAULT '',         -- 단말기 / 수동
    category         VARCHAR(30)   NOT NULL DEFAULT '',         -- 진료구분 (항목 1종이면 그 이름 · 여럿이면 '다중')
    product_name     VARCHAR(100)  NOT NULL DEFAULT '',         -- 품목 1종일 때만
    registered_by    VARCHAR(50)   NOT NULL DEFAULT '',
    registered_at    VARCHAR(19)   NOT NULL DEFAULT '',         -- 'YYYY-MM-DD HH:MM:SS' (취소행은 CstModDte)
    payment_memo     TEXT          NOT NULL DEFAULT '',
    amount           BIGINT        NOT NULL DEFAULT 0,          -- 수납금액 (취소행 음수)
    taxable          BIGINT        NOT NULL DEFAULT 0,
    exempt           BIGINT        NOT NULL DEFAULT 0,
    item_amounts     JSONB         NOT NULL DEFAULT '{}'::jsonb,
    loaded_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_vision_receipt_date
    ON list_vision_receipt (receipt_date);

CREATE INDEX IF NOT EXISTS idx_list_vision_receipt_cust
    ON list_vision_receipt (cust_num);
