-- =========================================================
-- 예약률(시력교정/백내장) 24·25 seed (V13)
-- Profile: postgres-mart
--
-- 대상 테이블: mart_reservation_rate_monthly (V5 에서 이미 생성)
--   PK: (yr, mo, category), category = 'vision' | 'cataract'
--
-- 24·25 확정값의 유일 원천. 이 파일이 mart 24·25 예약률의 SSOT.
-- 원본:
--   - frontend/src/pages/report/monthlyReportUtils.ts VISION_RATE_LEGACY, CATARACT_RATE_LEGACY
--   - frontend/src/pages/consultation/CataractReservationRatePage.tsx VISION_RATE_BY_YEAR, CATARACT_LEGACY_RATE_BY_YEAR
--   (두 파일 값 동일함을 확인)
--
-- 배치({@code ConsultationMartJob})는 min-year 가드로 24·25 범위를 write 하지 않는다.
-- 이 파일이 유일한 24·25 입력 지점.
--
-- ⚠️ exam_count / surgery_booked_count 원본값은 프론트 하드코딩에 없어 확인 불가.
--   프론트 로직이 examCount != 0 을 체크하므로 exam_count = 1 로 두어 표시를 허용.
--   surgery_booked_count 는 값 없음 → 0. 화면에는 reservation_rate 만 노출.
-- =========================================================

INSERT INTO mart_reservation_rate_monthly (yr, mo, category, exam_count, surgery_booked_count, reservation_rate) VALUES
    -- 2024 vision (시력교정)
    (2024,  1, 'vision', 1, 0, 77),
    (2024,  2, 'vision', 1, 0, 79),
    (2024,  3, 'vision', 1, 0, 77),
    (2024,  4, 'vision', 1, 0, 76),
    (2024,  5, 'vision', 1, 0, 78),
    (2024,  6, 'vision', 1, 0, 80),
    (2024,  7, 'vision', 1, 0, 76),
    (2024,  8, 'vision', 1, 0, 80),
    (2024,  9, 'vision', 1, 0, 79),
    (2024, 10, 'vision', 1, 0, 75),
    (2024, 11, 'vision', 1, 0, 72),
    (2024, 12, 'vision', 1, 0, 74),
    -- 2025 vision
    (2025,  1, 'vision', 1, 0, 75),
    (2025,  2, 'vision', 1, 0, 76),
    (2025,  3, 'vision', 1, 0, 79),
    (2025,  4, 'vision', 1, 0, 77),
    (2025,  5, 'vision', 1, 0, 76),
    (2025,  6, 'vision', 1, 0, 75),
    (2025,  7, 'vision', 1, 0, 77),
    (2025,  8, 'vision', 1, 0, 77),
    (2025,  9, 'vision', 1, 0, 76),
    (2025, 10, 'vision', 1, 0, 82),
    (2025, 11, 'vision', 1, 0, 77),
    (2025, 12, 'vision', 1, 0, 75),
    -- 2024 cataract (백내장)
    (2024,  1, 'cataract', 1, 0, 64),
    (2024,  2, 'cataract', 1, 0, 69),
    (2024,  3, 'cataract', 1, 0, 66),
    (2024,  4, 'cataract', 1, 0, 80),
    (2024,  5, 'cataract', 1, 0, 62),
    (2024,  6, 'cataract', 1, 0, 65),
    (2024,  7, 'cataract', 1, 0, 66),
    (2024,  8, 'cataract', 1, 0, 67),
    (2024,  9, 'cataract', 1, 0, 63),
    (2024, 10, 'cataract', 1, 0, 74),
    (2024, 11, 'cataract', 1, 0, 57),
    (2024, 12, 'cataract', 1, 0, 77),
    -- 2025 cataract
    (2025,  1, 'cataract', 1, 0, 68),
    (2025,  2, 'cataract', 1, 0, 57),
    (2025,  3, 'cataract', 1, 0, 59),
    (2025,  4, 'cataract', 1, 0, 49),
    (2025,  5, 'cataract', 1, 0, 58),
    (2025,  6, 'cataract', 1, 0, 44),
    (2025,  7, 'cataract', 1, 0, 55),
    (2025,  8, 'cataract', 1, 0, 63),
    (2025,  9, 'cataract', 1, 0, 57),
    (2025, 10, 'cataract', 1, 0, 55),
    (2025, 11, 'cataract', 1, 0, 57),
    (2025, 12, 'cataract', 1, 0, 55)
ON CONFLICT (yr, mo, category) DO NOTHING;
