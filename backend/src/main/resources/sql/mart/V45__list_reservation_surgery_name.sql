-- =========================================================
-- 예약자 리스트 — 수술명 우/좌 (V45)
-- Profile: postgres-mart
--
-- 수술등록일만으로는 "무슨 수술로 갔는지" 가 안 보인다. 이 예약으로 이어진
-- 첫 수술의 시술명을 좌·우로 붙인다.
--
-- 수술자 리스트(find-surgery-list.sql)와 같은 원천·같은 제외목록을 쓴다
-- — 시력교정 OPERATIONDATA · 백내장 Cataract_Operationdata. 표기가 일치해야
-- 두 화면을 대조할 수 있다.
--
-- ADD COLUMN IF NOT EXISTS + DEFAULT '' 라 기존 행도 안전하게 채워진다.
-- 값이 실리려면 RESERVATION 도메인 배치 재적재가 필요하다.
-- =========================================================

ALTER TABLE list_reservation
    ADD COLUMN IF NOT EXISTS surgery_r VARCHAR(200) NOT NULL DEFAULT '';

ALTER TABLE list_reservation
    ADD COLUMN IF NOT EXISTS surgery_l VARCHAR(200) NOT NULL DEFAULT '';
