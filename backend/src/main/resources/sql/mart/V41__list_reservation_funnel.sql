-- =========================================================
-- 예약자 리스트 — 예약 이후 흐름 3종 (V41)
-- Profile: postgres-mart
--
-- exam_reg_date    검사등록일. EXAM 에 등록 시각 컬럼이 없어 **검사일**을 쓴다.
-- exam_stop        그 검사의 중단 여부 Y/N (검사 없으면 빈값)
-- surgery_reg_date 수술예약(RESERVE_FLAG='O')을 잡은 날. 취소 제외, 날짜만.
--
-- 셋 다 "이 예약 이후 첫 건"이다 — 예약일 이전의 과거 기록은 잡지 않는다.
-- 2026-07 실측: 예약 14,025건 중 검사 1,634 · 중단 49 · 수술예약 1,757.
-- =========================================================

ALTER TABLE list_reservation ADD COLUMN IF NOT EXISTS exam_reg_date    VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE list_reservation ADD COLUMN IF NOT EXISTS exam_stop        VARCHAR(4)  NOT NULL DEFAULT '';
ALTER TABLE list_reservation ADD COLUMN IF NOT EXISTS surgery_reg_date VARCHAR(20) NOT NULL DEFAULT '';
