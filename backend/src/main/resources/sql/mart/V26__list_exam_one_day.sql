-- =========================================================
-- 전체 검사자 리스트 원데이 구분 컬럼 추가 (V26)
-- Profile: postgres-mart
--
-- 2026-07-24 d5f105b(all-exam-list 원데이 구분) 을 마트로 이관.
-- 시력교정 EXAM 행에 대해 같은날 M/5(검사OP) 예약 존재 여부를 배치 적재 시점에 저장.
-- 백내장(list_cataract_exam)은 항상 '' 리터럴로 examType 출력 → 컬럼 미도입.
--
-- 판정 규칙(find-exam-list.sql에서 계산):
--   STOP_YN <> 'Y' AND CANCEL_CD = '' AND EXAM_MEMO NOT LIKE '%테스트%'
--   AND EXISTS(RESERVATION FLAG='M' JINRYO='5' STATE IN ('I','H') 같은날) → 'Y'
--   그 외 → 'N'
--
-- 스타일: exam_stop 과 동일 (VARCHAR Y/N).
-- =========================================================

ALTER TABLE list_exam
    ADD COLUMN IF NOT EXISTS one_day VARCHAR(4) NOT NULL DEFAULT 'N';
