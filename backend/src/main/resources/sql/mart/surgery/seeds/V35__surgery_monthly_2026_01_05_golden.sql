-- =========================================================
-- 수술 월별 2026-01~05 확정값 (V35)
-- Profile: postgres-mart
--
-- 대상 테이블: mart_surgery_monthly (V2 에서 생성) · PK (yr, mo)
--
-- 왜 만드는가.
--   수술 집계를 v_all_surgery_list(리스트 기준) 로 옮기면서, 이미 월간보고로 나간
--   2026-01~05 값이 소급해 바뀌는 걸 막는다. 종전에는 이 구간에 시드가 없어
--   배치가 돌 때마다 MSSQL 라이브 결과로 다시 쓰였다(V15 는 24·25 만 덮는다).
--
--   실제로 정의를 바꾸면 움직이는 값이 있다 — 2026-02 시력교정이
--   리스트 1386 vs 월별 1388 로 2 차이가 난다(모집단 차이, 원인 미규명).
--   그 2명이 어느 쪽이 맞는지 가리기 전까지 이 구간은 얼려 둔다.
--
-- 값의 출처: 2026-08-06 시점 mart_surgery_monthly 실적재분을 그대로 떴다.
--   즉 "종전 MSSQL 집계 정의"의 마지막 확정 스냅샷이다.
--
-- ⚠️ 배치는 SurgeryMartJob.MART_LIVE_FROM(2026-06-01) 가드로 이 구간을 write 하지 않는다.
--    시드와 가드는 한 쌍이다 — 가드를 풀면 이 값이 덮인다.
-- ⚠️ presbyond 는 2026-05 만 4 이고 01~04 는 0 이다. 컬럼이 V33 에서 추가돼
--    그 이전 달은 백필되지 않은 상태 그대로다(0 이 "없음"이지 "미집계"가 아니다).
-- ⚠️ mart_surgery_daily 에는 이 구간 시드가 없다(24·25 도 마찬가지).
--    일별은 위 가드가 현재 적재분을 지키는 유일한 장치다.
-- =========================================================

INSERT INTO mart_surgery_monthly (
    yr, mo,
    lasek, lasik, smile, smile_pro,
    icl, t_icl, kpl, t_kpl, viva,
    cat_multi, cat_mono, cat_edof,
    xtra, wave_vision, mono_vision, contra, personal,
    lasek_ex, lasek_red,
    reoperation, reop_laser, reop_lens,
    vision_patients, cataract_patients, total,
    presbyond, piol_patients
) VALUES
(2026, 1, 157, 47, 482, 470, 48, 108, 15, 31, 3, 50, 10, 30, 327, 12, 37, 11, 0, 63, 94, 32, 12, 20, 1361, 90, 1483, 0, 205),
(2026, 2, 206, 52, 550, 396, 47, 96, 10, 28, 1, 41, 2, 24, 343, 22, 32, 22, 2, 55, 151, 33, 15, 18, 1388, 67, 1488, 0, 182),
(2026, 3, 47, 42, 218, 235, 36, 57, 9, 12, 3, 35, 8, 26, 139, 4, 30, 13, 3, 15, 32, 18, 7, 11, 657, 69, 744, 0, 117),
(2026, 4, 43, 14, 203, 223, 27, 44, 4, 10, 0, 12, 3, 27, 135, 9, 30, 4, 2, 8, 34, 19, 6, 13, 568, 42, 629, 0, 85),
(2026, 5, 63, 18, 242, 259, 40, 71, 9, 17, 0, 23, 6, 32, 166, 2, 47, 3, 6, 17, 46, 23, 11, 12, 722, 61, 806, 4, 137)
ON CONFLICT (yr, mo) DO UPDATE SET
    lasek = EXCLUDED.lasek,
    lasik = EXCLUDED.lasik,
    smile = EXCLUDED.smile,
    smile_pro = EXCLUDED.smile_pro,
    icl = EXCLUDED.icl,
    t_icl = EXCLUDED.t_icl,
    kpl = EXCLUDED.kpl,
    t_kpl = EXCLUDED.t_kpl,
    viva = EXCLUDED.viva,
    cat_multi = EXCLUDED.cat_multi,
    cat_mono = EXCLUDED.cat_mono,
    cat_edof = EXCLUDED.cat_edof,
    xtra = EXCLUDED.xtra,
    wave_vision = EXCLUDED.wave_vision,
    mono_vision = EXCLUDED.mono_vision,
    contra = EXCLUDED.contra,
    personal = EXCLUDED.personal,
    lasek_ex = EXCLUDED.lasek_ex,
    lasek_red = EXCLUDED.lasek_red,
    reoperation = EXCLUDED.reoperation,
    reop_laser = EXCLUDED.reop_laser,
    reop_lens = EXCLUDED.reop_lens,
    vision_patients = EXCLUDED.vision_patients,
    cataract_patients = EXCLUDED.cataract_patients,
    total = EXCLUDED.total,
    presbyond = EXCLUDED.presbyond,
    piol_patients = EXCLUDED.piol_patients;
