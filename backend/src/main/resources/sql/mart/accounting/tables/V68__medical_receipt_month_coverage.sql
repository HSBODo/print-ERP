-- 기존 데이터는 적재 범위를 증명할 수 없으므로 월 전체 재적재 전까지 집계 마트를 사용한다.
ALTER TABLE mart_medical_receipt_monthly
    ADD COLUMN IF NOT EXISTS rows_complete BOOLEAN NOT NULL DEFAULT FALSE;
