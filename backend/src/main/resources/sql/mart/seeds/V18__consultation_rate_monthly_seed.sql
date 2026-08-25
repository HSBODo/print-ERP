-- =========================================================
-- 전환·성공률 도메인 24·25 일반예약률 seed (V18)
-- Profile: postgres-mart
--
-- 대상 컬럼: mart_consultation_rate_monthly.vision_general_book_rate
-- 나머지 컬럼(count·다른 rate)은 DEFAULT 0 유지 — 24·25 원본이 없어 재계산 불가.
--
-- 이 시드가 채우는 지표: 월간레포트 > 비율 > 시력교정 일반예약률
--   (수술예약건 / 검사자, MonthlyReportPage.rateVisionGeneral)
--
-- 원본: 삭제된 frontend/src/data/monthlyReportLegacy.ts MONTHLY_LEGACY_CHARTS
--   'rate-vision-general' (2026-04 월간보고 PDF 확정값)
-- Phase 3-E 에서 이 하드코딩이 제거됐지만 마트에 시드가 없어 24·25 값이 화면에서
-- 사라진 문제를 이 시드가 복원.
--
-- 24·25 다른 rate(overallConsultation, visionConsultation, visionSurgery,
-- cataractSurgery)는 count 값이 없어 재계산 불가 — 프론트가 count>0 가드로 노출 제한.
--
-- 배치({@code ConsultationMartJob})는 min-year=2026 가드로 24·25 를 write 하지 않는다
-- (이 시드가 유일 소스).
-- =========================================================

INSERT INTO mart_consultation_rate_monthly (yr, mo, vision_general_book_rate) VALUES
    -- 2024
    (2024,  1, 67),
    (2024,  2, 63),
    (2024,  3, 64),
    (2024,  4, 63),
    (2024,  5, 68),
    (2024,  6, 73),
    (2024,  7, 63),
    (2024,  8, 72),
    (2024,  9, 65),
    (2024, 10, 63),
    (2024, 11, 57),
    (2024, 12, 60),
    -- 2025
    (2025,  1, 57),
    (2025,  2, 58),
    (2025,  3, 66),
    (2025,  4, 65),
    (2025,  5, 64),
    (2025,  6, 62),
    (2025,  7, 65),
    (2025,  8, 64),
    (2025,  9, 64),
    (2025, 10, 61),
    (2025, 11, 63),
    (2025, 12, 62)
ON CONFLICT (yr, mo) DO NOTHING;
