-- =========================================================
-- 수술 월별 집계 마트 (V2a) — SurgeryMonthlyItem
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_surgery_monthly (
    yr                  SMALLINT    NOT NULL,
    mo                  SMALLINT    NOT NULL,
    -- 시력교정
    lasek               INTEGER     NOT NULL DEFAULT 0,
    lasik               INTEGER     NOT NULL DEFAULT 0,
    smile               INTEGER     NOT NULL DEFAULT 0,
    smile_pro           INTEGER     NOT NULL DEFAULT 0,
    -- 렌즈/각막
    icl                 INTEGER     NOT NULL DEFAULT 0,
    t_icl               INTEGER     NOT NULL DEFAULT 0,
    kpl                 INTEGER     NOT NULL DEFAULT 0,
    t_kpl               INTEGER     NOT NULL DEFAULT 0,
    viva                INTEGER     NOT NULL DEFAULT 0,
    -- 백내장
    cat_multi           INTEGER     NOT NULL DEFAULT 0,
    cat_mono            INTEGER     NOT NULL DEFAULT 0,
    cat_edof            INTEGER     NOT NULL DEFAULT 0,
    -- 시력교정 부가시술 (add-on)
    xtra                INTEGER     NOT NULL DEFAULT 0,
    wave_vision         INTEGER     NOT NULL DEFAULT 0,
    mono_vision         INTEGER     NOT NULL DEFAULT 0,
    contra              INTEGER     NOT NULL DEFAULT 0,
    personal            INTEGER     NOT NULL DEFAULT 0,
    -- 라섹계 세부 (EYECLE)
    lasek_ex            INTEGER     NOT NULL DEFAULT 0,
    lasek_red           INTEGER     NOT NULL DEFAULT 0,
    -- 재수술
    reoperation         INTEGER     NOT NULL DEFAULT 0,
    reop_laser          INTEGER     NOT NULL DEFAULT 0,
    reop_lens           INTEGER     NOT NULL DEFAULT 0,
    -- 노안 전용 (presbyond) · 백내장 PIOL 환자수 (V33 통합)
    presbyond           INTEGER     NOT NULL DEFAULT 0,
    piol_patients       INTEGER     NOT NULL DEFAULT 0,
    -- 그룹별 환자 수 및 합계
    vision_patients     INTEGER     NOT NULL DEFAULT 0,
    cataract_patients   INTEGER     NOT NULL DEFAULT 0,
    total               INTEGER     NOT NULL DEFAULT 0,
    -- 감사
    loaded_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
