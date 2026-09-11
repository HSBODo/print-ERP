-- 해외마케팅 접수리스트: Google Sheet 1회성 이관 캐시 + 화면 수기 입력 행(origin='manual').
-- 2026-09-09 이관 — 2026-08-14 브랜치의 V58(CREATE) + V59~V62(ALTER 4종)를 "테이블 1개 = 파일 1개" 규약에 맞춰 통합.
CREATE TABLE IF NOT EXISTS overseas_marketing_sheet (
    sheet_row_number       INTEGER PRIMARY KEY,
    inquiry_date           VARCHAR(10),
    name                   VARCHAR(100) NOT NULL,
    contact                VARCHAR(100),
    email                  VARCHAR(300),
    gender                 VARCHAR(20),
    dob                    VARCHAR(30),
    nationality            VARCHAR(100),
    ethnicity              VARCHAR(100),
    occupation             VARCHAR(200),
    contact_lens           VARCHAR(100),
    medical_conditions     TEXT,
    medication_allergy     TEXT,
    departure_schedule     VARCHAR(200),
    exam_date              VARCHAR(200),
    surgery_date           VARCHAR(200),
    surgery_cost           VARCHAR(100),
    channel                VARCHAR(100),
    online_channel         VARCHAR(100),
    remark                 TEXT,
    synced_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 수기 입력 지원(구 V59): 행 출처(origin)·감사 컬럼·삭제 잠금(locked_at)
    origin                 VARCHAR(10) NOT NULL DEFAULT 'sheet',
    created_by             VARCHAR(100),
    updated_by             VARCHAR(100),
    updated_at             TIMESTAMP,
    locked_at              TIMESTAMP,
    -- CRM 매칭 영속화(구 V60): 한 번 매칭된 행은 이후 조회에서 CRM 이름 검색을 건너뛴다
    customer_no            VARCHAR(20),
    matched_at             TIMESTAMP,
    -- CRM 파생값(상태·수술정보·비용·외래) 스냅샷(구 V61): 조회 시 MSSQL 직결을 없앤다
    crm_snapshot           TEXT,
    crm_refreshed_at       TIMESTAMP,
    -- 매칭 3단계(접수/매칭/확인필요) 지원(구 V62)
    --  - candidate_customer_no: 전화·이메일로 찾았지만 확정 못한 CRM 후보 (확인필요 상태의 근거값)
    --  - candidate_reason: 후보 매칭 근거 문구 (담당자가 팝업에서 판단할 재료)
    --  - matched_by: 매칭 주체 — 자동은 'CRM_Sync', 수동은 로그인 ID (수동 매칭은 동기화·행수정에도 보존)
    candidate_customer_no  VARCHAR(20),
    candidate_reason       VARCHAR(300),
    matched_by             VARCHAR(100)
);

-- 2026-08-14 브랜치 V58 시점의 테이블만 있는 DB 호환: 뒤늦게 추가된 컬럼을 보강한다(신규 DB 에서는 no-op).
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS origin VARCHAR(10) NOT NULL DEFAULT 'sheet';
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS customer_no VARCHAR(20);
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP;
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS crm_snapshot TEXT;
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS crm_refreshed_at TIMESTAMP;
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS candidate_customer_no VARCHAR(20);
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS candidate_reason VARCHAR(300);
ALTER TABLE overseas_marketing_sheet ADD COLUMN IF NOT EXISTS matched_by VARCHAR(100);

CREATE INDEX IF NOT EXISTS ix_overseas_marketing_sheet_inquiry_date
    ON overseas_marketing_sheet (inquiry_date);
CREATE INDEX IF NOT EXISTS ix_overseas_marketing_sheet_customer_no
    ON overseas_marketing_sheet (customer_no);

-- 수기 행 PK 대역: 시트 행번호(수천 단위)와 겹치지 않도록 1,000,000부터 발급.
CREATE SEQUENCE IF NOT EXISTS overseas_marketing_manual_seq START WITH 1000000;

-- 기존 시트 행 소급(idempotent): 추가자 표기·잠금·자동 매칭 주체.
UPDATE overseas_marketing_sheet SET created_by = 'GoogleSheet_Sync' WHERE origin = 'sheet' AND created_by IS NULL;
UPDATE overseas_marketing_sheet SET locked_at = synced_at WHERE origin = 'sheet' AND locked_at IS NULL;
UPDATE overseas_marketing_sheet SET matched_by = 'CRM_Sync' WHERE customer_no IS NOT NULL AND matched_by IS NULL;
