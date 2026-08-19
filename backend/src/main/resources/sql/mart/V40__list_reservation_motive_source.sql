-- =========================================================
-- 예약자 리스트 — 내원동기(중) 출처 구분 (V40)
-- Profile: postgres-mart
--
-- 'CRM'  : MOTIVE_NEW02 에 등록된 값
-- 'MEMO' : CRM 이 비어 메모의 `TM고객(대/중)` 문구에서 끌어온 값 (2026-07 139건)
-- ''     : 둘 다 없음
--
-- 등록값과 메모 추출값을 섞어 세면 안 되므로 화면에서 구분해 보여준다.
-- =========================================================

ALTER TABLE list_reservation
    ADD COLUMN IF NOT EXISTS motive_m_source VARCHAR(10) NOT NULL DEFAULT '';
