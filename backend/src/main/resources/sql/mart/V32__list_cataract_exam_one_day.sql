-- =========================================================
-- 백내장 검사자 리스트 원데이 구분 컬럼 추가 (V32)
-- Profile: postgres-mart
--
-- 2026-08-05. V26 은 "백내장은 항상 '' 로 examType 출력 → 컬럼 미도입" 이었는데, 실제로는
-- 백내장 라인에도 원데이 진료구분이 따로 있다(MEDICAL_SUB_CFG: C_원데이=7 · C_노안원데이=9).
-- 2026-01~07 매월 0~4건 존재하는데 전체 검사자 리스트 원데이 컬럼에서 빈칸에 묻혀 있었다.
-- 이제 전체 리스트의 원데이 컬럼은 빈칸 없이 원데이/일반 둘 중 하나다.
--
-- 판정 규칙(find-cataract-exam-list.sql 에서 계산):
--   그 날 백내장검사 예약 중 RESERVE_JINRYO IN ('7','9') 이 하나라도 있으면 'Y', 아니면 'N'
--   ⚠️ 시력교정(list_exam.one_day)은 같은날 M/5 예약 내원 기준 — 판정 근거가 다르다.
--
-- 스타일: list_exam.one_day 와 동일 (VARCHAR(4) Y/N, 기본 'N').
-- =========================================================

ALTER TABLE list_cataract_exam
    ADD COLUMN IF NOT EXISTS one_day VARCHAR(4) NOT NULL DEFAULT 'N';
