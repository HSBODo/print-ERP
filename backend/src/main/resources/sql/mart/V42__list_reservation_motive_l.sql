-- =========================================================
-- 예약자 리스트 — 내원동기(대) 컬럼 (V42)
-- Profile: postgres-mart
--
-- (중)만으로는 '모두닥'·'전화상담관리' 가 어느 갈래인지 안 보인다.
-- (대)는 광고/바이럴/소개고객/홈페이지 같은 상위 분류라 둘을 같이 봐야 읽힌다.
--
-- 검사자 리스트(list_exam.motive_l)와 같은 값·같은 조인 규칙이다
-- — MOTIVE_NEW02.category01_name, Idx='1', pkey 최신 1건.
-- CRM 이 비면 메모의 `TM고객(대분류/중분류)` 에서 (중)과 같은 행에서 함께 뽑는다.
--
-- ADD COLUMN IF NOT EXISTS + DEFAULT '' 라 기존 행도 안전하게 채워진다.
-- 값이 실리려면 RESERVATION 도메인 배치 재적재가 필요하다.
-- =========================================================

ALTER TABLE list_reservation
    ADD COLUMN IF NOT EXISTS motive_l VARCHAR(200) NOT NULL DEFAULT '';
