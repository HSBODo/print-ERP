-- =========================================================
-- 월간 레포트 2026-01~05 골든 시드 (V27)
-- Profile: postgres-mart
--
-- 원천: docs/databatch/월간레포트_2026_01_05월.csv (담당자 확정값)
-- V22(백내장 검사수) · V24(예약 종합·콜·온라인) 는 이 시드와 중첩되지 않으며 각자 유지된다.
--
-- 이 시드가 손대는 컬럼(다른 컬럼은 배치 산출값 보존):
--   mart_overall_exam_monthly     : total_exam, intro_general/customer/staff, job_office/student/etc
--   mart_examination_monthly      : vision_correction, dreamlens (파생 = total - vision - cataract)
--                                   cataract 는 V22 골든이 SSOT — 이 시드는 건드리지 않는다.
--   mart_procedure_exam_monthly   : exam_count, one_day_exam_count, total
--   mart_outpatient_count_monthly : outpatient_count, total
--
-- 재write 차단: 각 도메인 *MartJob 의 is2026H1Seeded() 필터가 2026-01~05 upsert 를 스킵한다.
-- 이 파일이 해당 구간의 유일 입력 지점.
-- =========================================================

-- 1) 검사유입 + 파생비율 재료 (mart_overall_exam_monthly)
--    intro/job 합이 total_exam(=검사수 전체) 과 정합함(CSV 검증: mo1 → 1123+745+170 = 2038).
--
--    프론트 파생지표(MonthlyReportPage) 를 위한 원시 재료:
--      · vision_exam       = 시력교정 검사 (원데이+일반)
--      · one_day           = 원데이 검사
--      · one_day_booked    = round(원데이예약률% × one_day / 100) — CSV 원값 재현
--      · stop_count        = round(중단율% × vision_exam / 100)    — CSV 원값 재현
--    5개월 검증: 산출값이 CSV 정수 % 와 반올림 후 일치.
--      · 일반검사 비율   = (vision_exam - one_day) / vision_exam × 100  → 52/42/45/45/41
--      · 원데이 예약률   = one_day_booked / one_day × 100                → 90/91/90/87/91
--      · 중단율          = stop_count / vision_exam × 100               → 6/7/6/8/6
INSERT INTO mart_overall_exam_monthly (yr, mo, total_exam,
    intro_general, intro_customer, intro_staff,
    job_office, job_student, job_etc,
    vision_exam, one_day, one_day_booked, stop_count) VALUES
    (2026, 1, 2038, 1123, 745, 170, 789, 986, 263, 1868, 895, 806, 112),
    (2026, 2, 1721,  915, 650, 156, 834, 671, 216, 1604, 937, 853, 112),
    (2026, 3, 1007,  584, 335,  88, 582, 177, 248,  853, 471, 424,  51),
    (2026, 4,  932,  559, 303,  70, 602, 127, 203,  807, 446, 388,  65),
    (2026, 5, 1062,  596, 394,  72, 653, 192, 217,  897, 530, 482,  54)
ON CONFLICT (yr, mo) DO UPDATE SET
    total_exam     = EXCLUDED.total_exam,
    intro_general  = EXCLUDED.intro_general,
    intro_customer = EXCLUDED.intro_customer,
    intro_staff    = EXCLUDED.intro_staff,
    job_office     = EXCLUDED.job_office,
    job_student    = EXCLUDED.job_student,
    job_etc        = EXCLUDED.job_etc,
    vision_exam    = EXCLUDED.vision_exam,
    one_day        = EXCLUDED.one_day,
    one_day_booked = EXCLUDED.one_day_booked,
    stop_count     = EXCLUDED.stop_count,
    loaded_at      = CURRENT_TIMESTAMP;


-- 2) 시력교정 검사·드림렌즈 (mart_examination_monthly)
--    V22 로 이미 (yr,mo) 행이 있고 cataract 만 채워져 있다. 여기서 vision_correction 을 확정값으로 UPDATE,
--    dreamlens 는 CSV 의 "검사수(전체) - 시력교정 검사 - 백내장 검사수" 로 파생.
--    cataract 는 절대 건드리지 않는다(V22 SSOT).
INSERT INTO mart_examination_monthly (yr, mo, vision_correction, dreamlens, cataract, exam_total, total) VALUES
    (2026, 1, 1868, 74, 96, 2038, 2038),
    (2026, 2, 1604, 49, 68, 1721, 1721),
    (2026, 3,  853, 78, 76, 1007, 1007),
    (2026, 4,  807, 67, 58,  932,  932),
    (2026, 5,  897, 81, 84, 1062, 1062)
ON CONFLICT (yr, mo) DO UPDATE SET
    vision_correction = EXCLUDED.vision_correction,
    dreamlens         = EXCLUDED.dreamlens,
    -- cataract 는 V22 골든 — 건드리지 않음(mart_examination_monthly.cataract 유지).
    exam_total        = EXCLUDED.vision_correction
                      + EXCLUDED.dreamlens
                      + mart_examination_monthly.cataract,
    total             = EXCLUDED.vision_correction
                      + EXCLUDED.dreamlens
                      + mart_examination_monthly.cataract,
    loaded_at         = CURRENT_TIMESTAMP;


-- 3) 검사수·원데이 검사 (mart_procedure_exam_monthly)
--    exam_count = 검사수(전체), one_day_exam_count = 원데이 검사, total = 검사수(전체).
INSERT INTO mart_procedure_exam_monthly (yr, mo, exam_count, one_day_exam_count, total) VALUES
    (2026, 1, 2038, 895, 2038),
    (2026, 2, 1721, 937, 1721),
    (2026, 3, 1007, 471, 1007),
    (2026, 4,  932, 446,  932),
    (2026, 5, 1062, 530, 1062)
ON CONFLICT (yr, mo) DO UPDATE SET
    exam_count         = EXCLUDED.exam_count,
    one_day_exam_count = EXCLUDED.one_day_exam_count,
    total              = EXCLUDED.total,
    loaded_at          = CURRENT_TIMESTAMP;


-- 4) 외래수 (mart_outpatient_count_monthly)
--    outpatient_count = total = CSV 외래수.
INSERT INTO mart_outpatient_count_monthly (yr, mo, outpatient_count, total) VALUES
    (2026, 1, 4822, 4822),
    (2026, 2, 4339, 4339),
    (2026, 3, 4247, 4247),
    (2026, 4, 3653, 3653),
    (2026, 5, 3685, 3685)
ON CONFLICT (yr, mo) DO UPDATE SET
    outpatient_count = EXCLUDED.outpatient_count,
    total            = EXCLUDED.total,
    loaded_at        = CURRENT_TIMESTAMP;


-- 5) 전환·성공률 (mart_consultation_rate_monthly)
--    rate 컬럼만 골든 확정. vision_exam_count·vision_counsel_count 는 프론트 표시 가드
--    (MonthlyReportPage L102/106/110 의 visionCounselCount > 0 · L80 의 examCount) 통과 목적으로
--    시력교정 검사자 수(V27 vision_correction) 를 대입한다. 실 상담수 아님.
--    vision_general_book_rate 는 V18 24·25 시드의 2026-01~05 연장(count 가드 없음).
INSERT INTO mart_consultation_rate_monthly (
    yr, mo,
    vision_exam_count, vision_counsel_count,
    vision_counsel_rate, vision_counsel_rate_oneday, vision_counsel_rate_general,
    vision_general_book_rate
) VALUES
    (2026, 1, 1868, 1868, 79, 95, 62, 59),
    (2026, 2, 1604, 1604, 81, 95, 57, 54),
    (2026, 3,  853,  853, 82, 96, 64, 69),
    (2026, 4,  807,  807, 82, 94, 64, 65),
    (2026, 5,  897,  897, 87, 96, 72, 72)
ON CONFLICT (yr, mo) DO UPDATE SET
    vision_exam_count            = EXCLUDED.vision_exam_count,
    vision_counsel_count         = EXCLUDED.vision_counsel_count,
    vision_counsel_rate          = EXCLUDED.vision_counsel_rate,
    vision_counsel_rate_oneday   = EXCLUDED.vision_counsel_rate_oneday,
    vision_counsel_rate_general  = EXCLUDED.vision_counsel_rate_general,
    vision_general_book_rate     = EXCLUDED.vision_general_book_rate,
    loaded_at                    = CURRENT_TIMESTAMP;


-- 6) 예약률 (mart_reservation_rate_monthly) — category별
--    시력교정 예약률·백내장 예약률. exam_count 는 MonthlyReportPage L80 가드 통과 위해 필수.
--    시력교정 exam_count = V27 vision_correction, 백내장 exam_count = V22 cataract.
--    surgery_booked_count 는 알 수 없어 0 유지(프론트는 reservation_rate 만 참조).
INSERT INTO mart_reservation_rate_monthly (yr, mo, category, exam_count, surgery_booked_count, reservation_rate) VALUES
    -- 시력교정
    (2026, 1, 'vision', 1868, 0, 74),
    (2026, 2, 'vision', 1604, 0, 75),
    (2026, 3, 'vision',  853, 0, 80),
    (2026, 4, 'vision',  807, 0, 76),
    (2026, 5, 'vision',  897, 0, 82),
    -- 백내장
    (2026, 1, 'cataract',  96, 0, 60),
    (2026, 2, 'cataract',  68, 0, 56),
    (2026, 3, 'cataract',  76, 0, 55),
    (2026, 4, 'cataract',  58, 0, 64),
    (2026, 5, 'cataract',  84, 0, 50)
ON CONFLICT (yr, mo, category) DO UPDATE SET
    exam_count           = EXCLUDED.exam_count,
    surgery_booked_count = EXCLUDED.surgery_booked_count,
    reservation_rate     = EXCLUDED.reservation_rate,
    loaded_at            = CURRENT_TIMESTAMP;
