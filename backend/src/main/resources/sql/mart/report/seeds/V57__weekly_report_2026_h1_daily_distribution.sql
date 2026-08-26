-- =========================================================
-- 주차 레포트 2026 W1~W22 시드 — 월간 골든값 일수 비례 배분 (V57)
-- Profile: postgres-mart
--
-- 배경: 2026-01~05 (W1~W22) 주차 레포트 컬럼 다수가 비어 있어 화면이 텅 빈다.
--   원인 조합:
--   1) `WeeklyReportService` 가 `online` 을 컷오버(OverallOnlineFormula.CUTOVER=2026-06)
--      이전 구간에서 미상 처리 → null
--   2) list_exam/list_surgery 등 원천 리스트에 그 구간이 안 채워져 파생 컬럼 다수 null
--   해결: 이미 담당자 확정값이 있는 **월간 골든 시드 4종** 을 주차에 일수 비례로 배분해 채운다.
--
-- 원천 (월간 골든):
--   V24  reservation_overall_monthly           → reservations · online · call
--   V27  overall_exam_monthly / examination_monthly / procedure_exam_monthly / outpatient_count_monthly
--                                              → intro_* · job_* · exam_total · vision_exam · one_day
--                                                · one_day_booked · stop_count · outpatient
--        (examination_monthly.cataract 는 V22 SSOT — cataract_exam 으로 반영)
--   V35  surgery_monthly                       → vision_surgery · cataract_surgery · total_surgery
--                                                · reoperation · reop_laser · reop_lens
--
-- 배분 규칙:
--   주값 = Σ (해당 월값 × 그 주 안의 해당 월 일수 / 그 월 총 일수), 반올림
--   월 경계 주는 두 달 합산 (예: W5 = Jan×6/31 + Feb×1/28)
--   W1 은 Dec 3일 + Jan 4일 인데 Dec 원천 없음 → Jan 4일 비례만 반영(4/31 축소)
--
-- 담는 컬럼 22개 (DO UPDATE 절이 이 컬럼만 겨냥):
--   reservations · call_cnt · online
--   intro_general/customer/staff · job_office/student/etc
--   exam_total · vision_exam · cataract_exam · one_day · one_day_booked · stop_count
--   outpatient
--   vision_surgery · cataract_surgery · total_surgery · reoperation · reop_laser · reop_lens
--
-- 채우지 않는 컬럼 (해당 월간 원천 없음, NULL 유지):
--   vision_booked · cataract_booked · exam_general_base · booked_general
--   dreamlens_new/fu (V30 · V31 시드가 담당)
--
-- ⚠️ 부정확: 일수 비례라 요일·주 리듬 무시 (±5% 오차 가능). 담당자 주차 확정값이 나오면 교체할 것.
-- ⚠️ 재write 차단: `ReportMartJob.is2026H1WeeklySeeded()` 필터가 W1~W22 upsert 를 스킵한다.
--    시드와 가드는 한 쌍이다 — 가드를 풀면 이 값이 배치에 덮인다.
-- ⚠️ 멱등: MartSchemaInitializer 가 매 부팅 시 실행. ON CONFLICT (yr, wk) DO UPDATE 로 확정값 재보정.
-- =========================================================

INSERT INTO mart_weekly_report (
    yr, wk, start_date, end_date,
    reservations, call_cnt, online,
    intro_general, intro_customer, intro_staff,
    job_office, job_student, job_etc,
    exam_total, vision_exam, cataract_exam, one_day, one_day_booked, stop_count,
    outpatient,
    vision_surgery, cataract_surgery, total_surgery,
    reoperation, reop_laser, reop_lens
) VALUES
    (2026,  1,'2025-12-29','2026-01-04', 313, 185, 128, 145,  96, 22, 102, 127, 34, 263, 241, 12, 115, 104, 14,  622, 176, 12, 191,  4,  2,  3),
    (2026,  2,'2026-01-05','2026-01-11', 548, 323, 224, 254, 168, 38, 178, 223, 59, 460, 422, 22, 202, 182, 25, 1089, 307, 20, 335,  7,  3,  5),
    (2026,  3,'2026-01-12','2026-01-18', 548, 323, 224, 254, 168, 38, 178, 223, 59, 460, 422, 22, 202, 182, 25, 1089, 307, 20, 335,  7,  3,  5),
    (2026,  4,'2026-01-19','2026-01-25', 548, 323, 224, 254, 168, 38, 178, 223, 59, 460, 422, 22, 202, 182, 25, 1089, 307, 20, 335,  7,  3,  5),
    (2026,  5,'2026-01-26','2026-02-01', 537, 318, 219, 250, 167, 38, 182, 215, 59, 456, 419, 21, 207, 186, 26, 1088, 313, 20, 340,  7,  3,  5),
    (2026,  6,'2026-02-02','2026-02-08', 473, 283, 190, 229, 162, 39, 208, 168, 54, 430, 401, 17, 234, 213, 28, 1085, 347, 17, 372,  8,  4,  4),
    (2026,  7,'2026-02-09','2026-02-15', 473, 283, 190, 229, 162, 39, 208, 168, 54, 430, 401, 17, 234, 213, 28, 1085, 347, 17, 372,  8,  4,  4),
    (2026,  8,'2026-02-16','2026-02-22', 473, 283, 190, 229, 162, 39, 208, 168, 54, 430, 401, 17, 234, 213, 28, 1085, 347, 17, 372,  8,  4,  4),
    (2026,  9,'2026-02-23','2026-03-01', 448, 270, 178, 215, 150, 36, 197, 149, 54, 401, 371, 17, 216, 196, 26, 1067, 319, 17, 343,  8,  3,  4),
    (2026, 10,'2026-03-02','2026-03-08', 298, 189, 109, 132,  76, 20, 131,  40, 56, 227, 193, 17, 106,  96, 12,  959, 148, 16, 168,  4,  2,  2),
    (2026, 11,'2026-03-09','2026-03-15', 298, 189, 109, 132,  76, 20, 131,  40, 56, 227, 193, 17, 106,  96, 12,  959, 148, 16, 168,  4,  2,  2),
    (2026, 12,'2026-03-16','2026-03-22', 298, 189, 109, 132,  76, 20, 131,  40, 56, 227, 193, 17, 106,  96, 12,  959, 148, 16, 168,  4,  2,  2),
    (2026, 13,'2026-03-23','2026-03-29', 298, 189, 109, 132,  76, 20, 131,  40, 56, 227, 193, 17, 106,  96, 12,  959, 148, 16, 168,  4,  2,  2),
    (2026, 14,'2026-03-30','2026-04-05', 292, 179, 113, 131,  72, 17, 138,  33, 50, 220, 190, 15, 105,  92, 14,  883, 137, 11, 153,  4,  1,  3),
    (2026, 15,'2026-04-06','2026-04-12', 290, 175, 115, 130,  71, 16, 140,  30, 47, 217, 188, 14, 104,  91, 15,  852, 133, 10, 147,  4,  1,  3),
    (2026, 16,'2026-04-13','2026-04-19', 290, 175, 115, 130,  71, 16, 140,  30, 47, 217, 188, 14, 104,  91, 15,  852, 133, 10, 147,  4,  1,  3),
    (2026, 17,'2026-04-20','2026-04-26', 290, 175, 115, 130,  71, 16, 140,  30, 47, 217, 188, 14, 104,  91, 15,  852, 133, 10, 147,  4,  1,  3),
    (2026, 18,'2026-04-27','2026-05-03', 277, 167, 111, 132,  79, 16, 143,  36, 48, 227, 194, 16, 111,  98, 14,  844, 146, 12, 162,  5,  2,  3),
    (2026, 19,'2026-05-04','2026-05-10', 260, 155, 105, 135,  89, 16, 147,  43, 49, 240, 203, 19, 120, 109, 12,  832, 163, 14, 182,  5,  2,  3),
    (2026, 20,'2026-05-11','2026-05-17', 260, 155, 105, 135,  89, 16, 147,  43, 49, 240, 203, 19, 120, 109, 12,  832, 163, 14, 182,  5,  2,  3),
    (2026, 21,'2026-05-18','2026-05-24', 260, 155, 105, 135,  89, 16, 147,  43, 49, 240, 203, 19, 120, 109, 12,  832, 163, 14, 182,  5,  2,  3),
    (2026, 22,'2026-05-25','2026-05-31', 260, 155, 105, 135,  89, 16, 147,  43, 49, 240, 203, 19, 120, 109, 12,  832, 163, 14, 182,  5,  2,  3)
ON CONFLICT (yr, wk) DO UPDATE SET
    reservations     = EXCLUDED.reservations,
    call_cnt         = EXCLUDED.call_cnt,
    online           = EXCLUDED.online,
    intro_general    = EXCLUDED.intro_general,
    intro_customer   = EXCLUDED.intro_customer,
    intro_staff      = EXCLUDED.intro_staff,
    job_office       = EXCLUDED.job_office,
    job_student      = EXCLUDED.job_student,
    job_etc          = EXCLUDED.job_etc,
    exam_total       = EXCLUDED.exam_total,
    vision_exam      = EXCLUDED.vision_exam,
    cataract_exam    = EXCLUDED.cataract_exam,
    one_day          = EXCLUDED.one_day,
    one_day_booked   = EXCLUDED.one_day_booked,
    stop_count       = EXCLUDED.stop_count,
    outpatient       = EXCLUDED.outpatient,
    vision_surgery   = EXCLUDED.vision_surgery,
    cataract_surgery = EXCLUDED.cataract_surgery,
    total_surgery    = EXCLUDED.total_surgery,
    reoperation      = EXCLUDED.reoperation,
    reop_laser       = EXCLUDED.reop_laser,
    reop_lens        = EXCLUDED.reop_lens,
    loaded_at        = CURRENT_TIMESTAMP;
