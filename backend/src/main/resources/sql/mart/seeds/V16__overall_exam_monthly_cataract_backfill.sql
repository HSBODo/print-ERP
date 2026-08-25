-- =========================================================
-- 검사자 종합표 24·25 백내장·시력교정예약 backfill (V16)
-- Profile: postgres-mart
--
-- V14 시드는 vision_booked·cataract_* 를 원본 부재로 0 저장했지만,
-- 실제로 OverallExamPage 프론트가 이 컬럼들을 화면(35칼럼)에 렌더링 중이었다.
-- 프론트 하드코딩(ROWS_LEGACY) 제거를 위해 마트에 backfill.
--
-- 값 원천: frontend/src/pages/overall/OverallExamPage.tsx ROWS_LEGACY (제거 예정)
--   cells[7] → vision_booked
--   cells[9] → cataract_total (2024는 원본 공란 → cataract_only + 노안2(cells[20]) 로 재구성)
--   cells[10] → cataract_only
--   cells[12] → cataract_booked
--
-- 파생 산식(예약률·전환률 등)은 프론트 apiItemToRow 가 원시값으로 계산한다.
-- 2024 전환률(idx14)은 레거시 하드코딩 값(예: 32%)과 재계산값이 다를 수 있음 —
-- 원본 산식이 booked/total 이 아니었던 것으로 추정. 마트 산식(booked/total)이 정본.
--
-- 배치({@code OverallMartJob})는 min-year=2026 가드로 24·25 를 write 하지 않는다.
-- 이 파일이 24·25 backfill 의 유일 입력 지점 (V14 + V16 = 24·25 SSOT).
-- =========================================================

UPDATE mart_overall_exam_monthly AS m SET
    vision_booked = v.vision_booked,
    cataract_total = v.cataract_total,
    cataract_only = v.cataract_only,
    cataract_booked = v.cataract_booked
FROM (VALUES
    -- 2024 (cataract_total = cataract_only + 노안2. 원본 백내장 전체 없음)
    (2024,  1, 1642, 234,  76, 49),
    (2024,  2, 1426, 164,  64, 44),
    (2024,  3,  800, 184,  53, 35),
    (2024,  4,  707, 171,  50, 40),
    (2024,  5,  919, 180,  65, 40),
    (2024,  6, 1008, 113,  43, 28),
    (2024,  7, 1150, 136,  62, 41),
    (2024,  8, 1260, 134,  51, 34),
    (2024,  9,  961,  92,  48, 30),
    (2024, 10,  850, 122,  73, 54),
    (2024, 11, 1028, 137,  70, 40),
    (2024, 12, 1541, 143,  75, 58),
    -- 2025 (cataract_total = 원본 백내장 전체(노안포함))
    (2025,  1, 1740, 117,  74, 50),
    (2025,  2, 1488, 126,  68, 39),
    (2025,  3,  803, 124,  76, 45),
    (2025,  4,  776, 101,  59, 29),
    (2025,  5,  853, 116,  55, 32),
    (2025,  6,  802, 103,  55, 24),
    (2025,  7,  861, 135,  74, 41),
    (2025,  8,  890, 146,  78, 49),
    (2025,  9,  810, 105,  76, 43),
    (2025, 10, 1015, 104,  66, 36),
    (2025, 11,  762,  81,  53, 30),
    (2025, 12, 1268, 151,  96, 53)
) AS v(yr, mo, vision_booked, cataract_total, cataract_only, cataract_booked)
WHERE m.yr = v.yr
  AND m.mo = v.mo;
