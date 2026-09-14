-- =========================================================
-- 주차 레포트 드림렌즈 — 2026년 31주차 (V31)
-- Profile: postgres-mart
--
-- ⚠️ V30 과 출처가 다르다. 파일을 나눈 이유가 이것이다.
--   V30 (W1~30) : 「2026 외래센터 주간보고 30주차」 PDF — 담당자 확정값
--   V31 (W31)   : **드림렌즈 장부에서 산출한 값** — 31주차 주간보고가 아직 없어서다.
--
-- 산출 규칙(2026-07-27 ~ 2026-08-02, dreamlens_ledger):
--   신규 = D/L·M·H/L 신규 매출이 있는 행     → 11건
--          (진료구분='신규' 기준으로 세도 11건으로 같다)
--   FU   = 전체 91행 − 신규 11              → 80건
--
-- 정확도 주의: 같은 규칙을 W1~30 에 적용해 주간보고와 대조하면
--   신규 8/30주 · FU 5/30주만 일치했다(판정 기준과 주 경계가 다름).
--   30주차만 우연히 4/55 로 정확히 맞았다.
--   → 31주차 주간보고가 나오면 이 값을 확정값으로 교체할 것.
-- =========================================================

INSERT INTO mart_weekly_report (yr, wk, start_date, end_date, dreamlens_new, dreamlens_fu)
VALUES (2026, 31, DATE '2026-07-27', DATE '2026-08-02', 11, 80)
ON CONFLICT (yr, wk) DO UPDATE SET
    dreamlens_new = EXCLUDED.dreamlens_new,
    dreamlens_fu  = EXCLUDED.dreamlens_fu,
    loaded_at     = CURRENT_TIMESTAMP;
