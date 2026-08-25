-- =========================================================
-- 백내장 검사수 2026-01~05 골든 고정 (V22)
-- Profile: postgres-mart
--
-- 배경: 2026-07-23 레거시 원장(BCRM > 통계(C) > 통계_백내장_내원동기)의 원본 SQL을 확보해
--       백내장 검사수 정의를 눈(안) → 사람으로 교체했다(find-cataract-monthly.sql).
--       6월은 55/55 로 정확히 일치하지만, 분류가 CUSTOM 의 **현재** 담당자 값(MY_OPTOMETRIST·
--       MY_COUNSELOR)을 참조하는 구조라 담당자 재배정 시 과거 달이 소급 변동한다.
--       실제로 2026-01~05 재집계값은 95·65·75·63·80 으로 골든과 −4~+5 어긋난다.
--
-- 결정: 2026-01~05 는 월간보고 골든 확정값을 고정하고, 신규 정의는 2026-06 부터 적용한다.
--       (2024·2025 는 종전대로 V9 seed 가 SSOT — 이 파일은 건드리지 않는다.)
--
-- 골든 원천: 월간보고 PDF 백내장 검사수
--   2026-01=96 · 02=68 · 03=76 · 04=58 · 05=84   (06=55 는 라이브 산출값과 일치해 고정 대상 아님)
--
-- 재write 차단: upsert-examination-monthly.sql 의 ON CONFLICT 절이 2026-01~05 구간의
--              cataract 를 EXCLUDED 로 덮지 않는다. 이 파일이 해당 구간의 유일 입력 지점.
--
-- 멱등: MartSchemaInitializer 가 매 기동 시 실행한다. 행이 이미 있으면 cataract 만 갱신하고
--       exam_total·total 을 기존 vision_correction + dreamlens 로 재계산한다.
--       신규 DB 라 행이 없으면 vision_correction·dreamlens = 0 으로 선삽입되고,
--       이후 배치가 그 두 값을 채우면서 cataract 는 위 가드가 보존한다.
-- =========================================================

INSERT INTO mart_examination_monthly (yr, mo, vision_correction, dreamlens, cataract, exam_total, total) VALUES
    (2026, 1, 0, 0, 96, 96, 96),
    (2026, 2, 0, 0, 68, 68, 68),
    (2026, 3, 0, 0, 76, 76, 76),
    (2026, 4, 0, 0, 58, 58, 58),
    (2026, 5, 0, 0, 84, 84, 84)
ON CONFLICT (yr, mo) DO UPDATE SET
    cataract   = EXCLUDED.cataract,
    exam_total = mart_examination_monthly.vision_correction
               + mart_examination_monthly.dreamlens
               + EXCLUDED.cataract,
    total      = mart_examination_monthly.vision_correction
               + mart_examination_monthly.dreamlens
               + EXCLUDED.cataract,
    loaded_at  = CURRENT_TIMESTAMP;
