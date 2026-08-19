-- =========================================================
-- 주차 레포트 — 재수술 3종 컬럼 (V38)
-- Profile: postgres-mart
--
-- 주차 레포트에는 재수술이 처음부터 없었다(마트·DTO·화면 전부). 월간 레포트는
-- 수술 상세표로 보여주는데 주차만 빠져 있어서, 같은 도표를 주차축으로 본다는
-- 전제가 깨져 있었다.
--
-- 값은 v_all_surgery_list 일별 집계(select-surgery-daily-agg.sql)의
-- reoperation / reop_laser / reop_lens 를 ISO 주차로 합산해 채운다 —
-- 수술 건수 화면·월간 레포트와 같은 정의다.
--
-- ⚠️ 단위는 **건**이다(사람·눈이 아니다). 같은 사람이 같은 날 수술과 재수술에
--    함께 잡힐 수 있다 — total_surgery 가 그렇게 정의돼 있다.
-- ⚠️ 레이저 + 렌즈 = 재수술 합계가 성립해야 한다.
-- =========================================================

ALTER TABLE mart_weekly_report ADD COLUMN IF NOT EXISTS reoperation INT;
ALTER TABLE mart_weekly_report ADD COLUMN IF NOT EXISTS reop_laser  INT;
ALTER TABLE mart_weekly_report ADD COLUMN IF NOT EXISTS reop_lens   INT;
