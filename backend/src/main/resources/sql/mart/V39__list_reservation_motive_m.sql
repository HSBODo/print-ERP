-- =========================================================
-- 예약자 리스트 — 내원동기(중) 컬럼 (V39)
-- Profile: postgres-mart
--
-- 예약이 어느 경로로 들어왔는지 보려면 채널(인콜/온라인)만으로는 부족하다.
-- 내원동기(중)에 '모두닥'·'인터넷검색(홈페이지)'·'온라인(포털포함)' 처럼
-- 실제 유입처가 들어온다(2026-07 모두닥 393건).
--
-- 검사자 리스트(list_exam.motive_m)와 같은 값·같은 조인 규칙이다
-- — MOTIVE_NEW02.category02_name, Idx='1', pkey 최신 1건.
--
-- ADD COLUMN IF NOT EXISTS + DEFAULT '' 라 기존 행도 안전하게 채워진다.
-- 값이 실리려면 RESERVATION 도메인 배치 재적재가 필요하다.
-- =========================================================

ALTER TABLE list_reservation
    ADD COLUMN IF NOT EXISTS motive_m VARCHAR(200) NOT NULL DEFAULT '';
