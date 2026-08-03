-- =========================================================
-- 주차 레포트 — 드림렌즈 신규/FU 컬럼 (V29)
-- Profile: postgres-mart
--
-- 외래센터 주간보고의 '주차별 드림렌즈 신규수'·'주차별 드림렌즈 FU수'를 주차 레포트에 싣는다.
--
-- ⚠️ 이 두 컬럼은 배치가 채우지 않는다 — upsert-weekly-report.sql 이 컬럼을 명시적으로
--    나열하므로 배치가 돌아도 여기 값은 보존된다. 입력 지점은 V30 골든 시드 하나뿐이다.
--    사내 시스템에 신규/FU 를 나누는 소스가 없어(EXAM·RESERVATION 어디에도 구분 없음)
--    담당자 확정값인 주간보고 수치를 SSOT 로 쓴다. V27 골든 시드와 같은 방식.
--
-- 값이 NULL 이면 "그 주는 알 수 없음"이고 0 과 구분해야 하므로 NOT NULL 을 걸지 않는다.
-- =========================================================

ALTER TABLE mart_weekly_report ADD COLUMN IF NOT EXISTS dreamlens_new INT;
ALTER TABLE mart_weekly_report ADD COLUMN IF NOT EXISTS dreamlens_fu  INT;
