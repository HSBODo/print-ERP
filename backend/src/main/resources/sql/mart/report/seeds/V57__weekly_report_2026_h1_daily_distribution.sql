-- =========================================================
-- 주차 레포트 2026 W1~W22 시드 — 예약 3컬럼 + 수술 4컬럼 (V57)
-- Profile: postgres-mart
--
-- 배경: 배치가 W1~W22 구간에 두 이유로 데이터를 못 만든다.
--   1) 예약 종합·콜·온라인 3컬럼:
--      `WeeklyReportService.accumulateReservationsFromMart` 는 컷오버(2026-06) 이전
--      구간에서 online 을 미상으로 두고 → reservations = call + online 도 null.
--      RESERVE_PATH legacy 정의(ONLINE/APP/NAVER) 가 채널 마트에 없기 때문.
--   2) 수술 4컬럼 (vision_surgery·cataract_surgery·total_surgery·reoperation):
--      SurgeryMartJob.MART_LIVE_FROM(2026-06-01) 클램프로 이 구간에 list_surgery
--      원천 자체가 없다(월간 V35 골든만 있음). 접을 게 없어 4컬럼도 null.
--   → 화면에서 W1~W22 만 텅 비는 그 자리를 이 시드가 채운다.
--
-- 나머지 16 컬럼은 왜 안 채우나:
--   list_exam/list_outpatient 라이브 접기로 배치가 채워둔다. 시드로 덮으면 실제 값의
--   정확도가 떨어지고 실측 검증(어느 컬럼이 실제로 비는지) 도 불가.
--
-- 원천 (월간 골든):
--   V24  reservation_overall_monthly     → reservations · call_cnt · online
--   V35  mart_surgery_monthly            → vision_surgery(vision_patients) · cataract_surgery(cataract_patients) · total_surgery(total) · reoperation
--
-- 배분 규칙:
--   주값 = Σ (해당 월값 × 그 주 안의 해당 월 일수 / 그 월 총 일수), 반올림
--   월 경계 주는 두 달 합산. W1 은 Dec 원천 없어 Jan 4일 비례만 반영(4/31 축소).
--
-- 담는 컬럼 7개 (DO UPDATE 절이 이 컬럼만 겨냥):
--   reservations · call_cnt · online · vision_surgery · cataract_surgery · total_surgery · reoperation
--
-- ⚠️ 정합:
--     ① reservations ≈ call_cnt + online (예약 3컬럼 세트)
--     ② total_surgery ≈ vision_surgery + cataract_surgery + reoperation (수술 4컬럼 세트)
--     둘 다 세트 중 하나만 배치값·나머지만 시드값이 되면 화면 검산이 어긋난다 →
--     세트 단위로 시드하고, upsert 도 세트 단위(스위치 컬럼 null) 로 지킨다.
--     세트 안 내부 ±1 의 반올림 드리프트는 허용(각 주 독립 반올림).
-- ⚠️ 부정확: 일수 비례라 요일·주 리듬 무시 (±5% 오차 가능). 담당자 주차 확정값이 나오면 교체할 것.
-- ⚠️ 재write 보호: upsert-weekly-report.sql 이 두 스위치로 세트를 지킨다.
--     ① EXCLUDED.online IS NULL          → 예약 3컬럼 시드 유지
--     ② EXCLUDED.total_surgery IS NULL   → 수술 4컬럼 시드 유지
--    산출 가능한 구간(W23~) 에서는 두 스위치가 다 non-null 이라 배치값이 들어간다.
-- ⚠️ reop_laser/reop_lens 는 여기서 시드하지 않는다. 세트 내부 breakdown 이라 batch 가
--    산출하면 채워지고, 못 산출하면 null 로 남는다(재수술 합계는 시드가 지킨다).
-- ⚠️ 멱등: MartSchemaInitializer 가 매 부팅 시 실행. ON CONFLICT (yr, wk) DO UPDATE 로 확정값 재보정.
-- =========================================================

INSERT INTO mart_weekly_report (
    yr, wk, start_date, end_date,
    reservations, call_cnt, online,
    vision_surgery, cataract_surgery, total_surgery, reoperation
) VALUES
    (2026,  1,'2025-12-29','2026-01-04', 313, 185, 128, 176, 12, 191,  4),
    (2026,  2,'2026-01-05','2026-01-11', 548, 323, 224, 307, 20, 335,  7),
    (2026,  3,'2026-01-12','2026-01-18', 548, 323, 224, 307, 20, 335,  7),
    (2026,  4,'2026-01-19','2026-01-25', 548, 323, 224, 307, 20, 335,  7),
    (2026,  5,'2026-01-26','2026-02-01', 537, 318, 219, 313, 20, 340,  7),
    (2026,  6,'2026-02-02','2026-02-08', 473, 283, 190, 347, 17, 372,  8),
    (2026,  7,'2026-02-09','2026-02-15', 473, 283, 190, 347, 17, 372,  8),
    (2026,  8,'2026-02-16','2026-02-22', 473, 283, 190, 347, 17, 372,  8),
    (2026,  9,'2026-02-23','2026-03-01', 448, 270, 178, 319, 17, 343,  8),
    (2026, 10,'2026-03-02','2026-03-08', 298, 189, 109, 148, 16, 168,  4),
    (2026, 11,'2026-03-09','2026-03-15', 298, 189, 109, 148, 16, 168,  4),
    (2026, 12,'2026-03-16','2026-03-22', 298, 189, 109, 148, 16, 168,  4),
    (2026, 13,'2026-03-23','2026-03-29', 298, 189, 109, 148, 16, 168,  4),
    (2026, 14,'2026-03-30','2026-04-05', 292, 179, 113, 137, 11, 153,  4),
    (2026, 15,'2026-04-06','2026-04-12', 290, 175, 115, 133, 10, 147,  4),
    (2026, 16,'2026-04-13','2026-04-19', 290, 175, 115, 133, 10, 147,  4),
    (2026, 17,'2026-04-20','2026-04-26', 290, 175, 115, 133, 10, 147,  4),
    (2026, 18,'2026-04-27','2026-05-03', 277, 167, 111, 146, 12, 162,  5),
    (2026, 19,'2026-05-04','2026-05-10', 260, 155, 105, 163, 14, 182,  5),
    (2026, 20,'2026-05-11','2026-05-17', 260, 155, 105, 163, 14, 182,  5),
    (2026, 21,'2026-05-18','2026-05-24', 260, 155, 105, 163, 14, 182,  5),
    (2026, 22,'2026-05-25','2026-05-31', 260, 155, 105, 163, 14, 182,  5)
ON CONFLICT (yr, wk) DO UPDATE SET
    reservations     = EXCLUDED.reservations,
    call_cnt         = EXCLUDED.call_cnt,
    online           = EXCLUDED.online,
    vision_surgery   = EXCLUDED.vision_surgery,
    cataract_surgery = EXCLUDED.cataract_surgery,
    total_surgery    = EXCLUDED.total_surgery,
    reoperation      = EXCLUDED.reoperation,
    loaded_at        = CURRENT_TIMESTAMP;
