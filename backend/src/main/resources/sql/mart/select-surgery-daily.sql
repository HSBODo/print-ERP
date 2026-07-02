SELECT
    TO_CHAR(dt, 'YYYY-MM-DD') AS "date",
    lasek,
    lasik,
    smile,
    smile_pro         AS "smilePro",
    icl,
    t_icl             AS "tIcl",
    kpl,
    t_kpl             AS "tKpl",
    viva,
    cat_multi         AS "catMulti",
    cat_mono          AS "catMono",
    cat_edof          AS "catEdof",
    xtra,
    wave_vision       AS "waveVision",
    mono_vision       AS "monoVision",
    contra,
    personal,
    lasek_ex          AS "lasekEx",
    lasek_red         AS "lasekRed",
    reoperation,
    reop_laser        AS "reopLaser",
    reop_lens         AS "reopLens",
    vision_patients   AS "visionPatients",
    cataract_patients AS "cataractPatients",
    total
  FROM mart_surgery_daily
 WHERE dt >= CAST(:from AS DATE)
   AND dt <= CAST(:to   AS DATE)
 ORDER BY dt
