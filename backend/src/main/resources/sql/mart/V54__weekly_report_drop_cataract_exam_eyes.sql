-- =========================================================
-- 주차 레포트 — cataract_exam_eyes 컬럼 삭제 (V54)
-- Profile: postgres-mart
--
-- 왜.
--   백내장 예약률을 눈 단위(cataract_exam_eyes 분모) → 사람 단위(cataract_exam 분모) 로 통일.
--   배치의 mart_reservation_rate_monthly[cataract] · 담당자 확정 골든값(V27) 모두 이미 사람 단위.
--   주차만 눈 단위였던 걸 맞춘다.
--
-- ⚠️ 이 마이그레이션 적용 후 mart_weekly_report 를 다시 배치로 채워야
--    cataract_booked 가 사람 단위 새 정의로 재계산된다(ReportMartJob 실행 필요).
-- =========================================================

ALTER TABLE mart_weekly_report
    DROP COLUMN IF EXISTS cataract_exam_eyes;
