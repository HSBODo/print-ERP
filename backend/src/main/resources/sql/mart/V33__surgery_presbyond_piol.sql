-- =========================================================
-- 수술 마트 — PRESBYOND 유형 + PIOL 실인원 컬럼 (V33)
-- Profile: postgres-mart
--
-- presbyond      : 노안 레이저(PRESBYOND). 이전에는 분류 CASE 에 분기가 없어
--                  other 로 떨어져 총계에만 들어가고 유형별 표에서는 안 보였다.
-- piol_patients  : PIOL DISTINCT 환자 수. 화면이 icl+t_icl+kpl+t_kpl+viva 로
--                  단순 합산하던 것을 대체한다 — 양안에 다른 렌즈를 넣은 환자가
--                  이중 계상됐다(2026-07 실측: 합산 168 vs 실인원 148).
--
-- ADD COLUMN IF NOT EXISTS 라 재실행 안전. 기존 행은 DEFAULT 0 으로 채워지므로
-- 값이 채워지려면 SURGERY 도메인 배치 재적재가 필요하다.
-- =========================================================

ALTER TABLE mart_surgery_daily
    ADD COLUMN IF NOT EXISTS presbyond     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mart_surgery_daily
    ADD COLUMN IF NOT EXISTS piol_patients INTEGER NOT NULL DEFAULT 0;

ALTER TABLE mart_surgery_monthly
    ADD COLUMN IF NOT EXISTS presbyond     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mart_surgery_monthly
    ADD COLUMN IF NOT EXISTS piol_patients INTEGER NOT NULL DEFAULT 0;
