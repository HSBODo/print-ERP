-- 수술 일별 집계 — v_all_surgery_list(= 수술자 리스트 + 재수술) 하나에서 뽑는다.
--
-- 월별 레포트·주차 레포트·수술 건수·수술별 비중이 **모두 이 결과를 합산**해서 쓴다.
-- 종전에는 같은 지표를 MSSQL 쿼리 4벌(시력교정 월별/일별 · 백내장 월별/일별)이 각자
-- 구현해서, 정의가 바뀌면 여러 곳을 고쳐야 했고 하나 빠뜨리면 조용히 어긋났다
-- (2026-06 백내장 리스트 62 vs 집계 65).
--
-- 일(day) 단위로 주는 이유 — 월별은 월로, 주차는 ISO 주차로 각자 접으면 되고
-- 두 축이 같은 행에서 나오므로 서로 어긋날 수 없다. select-exam-daily-agg.sql 과 같은 구조다.
--
-- ★ 집계 단위 (뷰 머리주석 참조)
--     vision_patients   사람 — COUNT(DISTINCT patient_key)
--     cataract_patients 안   — COUNT(*)   ※ 이름은 Patients 지만 눈 단위다(레거시 컬럼명 유지)
--     reoperation       건   — 최종 포함 판정된 재수술 행
--     total             셋의 합. 같은 사람·같은 날이 수술과 재수술에 중복 계상될 수 있으나
--                       레거시도 같은 방식이라 걸러내지 않는다.
--
-- ⚠️ 시력교정 유형별·부가시술은 **환자 단위 DISTINCT** 다(눈마다 세지 않는다).
--    PIOL 5종만 대표유형(is_piol_primary) 한 건으로 제한한다 — 양안에 다른 렌즈를 넣은
--    환자가 유형마다 중복 계상되는 걸 막기 위해서다(2026-07: 168 vs 실인원 148).
-- ⚠️ 백내장 유형별(cat_*)은 **눈 단위 COUNT(*)** 다. cataract_patients 와 단위가 같아야
--    catMulti + catEdof + catMono = cataract_patients 가 성립한다.
SELECT
    surgery_date                                                            AS dt,

    -- 시력교정 유형별 (환자 단위)
    COUNT(DISTINCT patient_key) FILTER (WHERE op_type = 'lasek')            AS lasek,
    COUNT(DISTINCT patient_key) FILTER (WHERE op_type = 'lasik')            AS lasik,
    COUNT(DISTINCT patient_key) FILTER (WHERE op_type = 'smile')            AS smile,
    COUNT(DISTINCT patient_key) FILTER (WHERE op_type = 'smilePro')         AS smile_pro,
    COUNT(DISTINCT patient_key) FILTER (WHERE op_type = 'presbyond')        AS presbyond,

    -- PIOL 유형별 — 대표유형 한 건만
    COUNT(DISTINCT patient_key) FILTER (WHERE is_piol_primary AND op_type = 'icl')  AS icl,
    COUNT(DISTINCT patient_key) FILTER (WHERE is_piol_primary AND op_type = 'tIcl') AS t_icl,
    COUNT(DISTINCT patient_key) FILTER (WHERE is_piol_primary AND op_type = 'kpl')  AS kpl,
    COUNT(DISTINCT patient_key) FILTER (WHERE is_piol_primary AND op_type = 'tKpl') AS t_kpl,
    COUNT(DISTINCT patient_key) FILTER (WHERE is_piol_primary AND op_type = 'viva') AS viva,
    -- PIOL 실인원. 위 대표유형 5종의 합과 같다(같아야 한다).
    COUNT(DISTINCT patient_key) FILTER (WHERE op_type IN ('icl','tIcl','kpl','tKpl','viva'))
                                                                            AS piol_patients,

    -- 부가시술 (환자 단위)
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_xtra)                   AS xtra,
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_wave_vision)            AS wave_vision,
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_mono_vision)            AS mono_vision,
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_contra)                 AS contra,
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_personal)               AS personal,
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_lasek_ex)               AS lasek_ex,
    COUNT(DISTINCT patient_key) FILTER (WHERE addon_lasek_red)              AS lasek_red,

    -- 백내장 유형별 (눈 단위)
    COUNT(*) FILTER (WHERE op_type = 'catMulti')                            AS cat_multi,
    COUNT(*) FILTER (WHERE op_type = 'catMono')                             AS cat_mono,
    COUNT(*) FILTER (WHERE op_type = 'catEdof')                             AS cat_edof,

    -- 재수술 (건 단위, 최종 판정 포함분만)
    COUNT(*) FILTER (WHERE surgery_category = '재수술' AND included)         AS reoperation,
    COUNT(*) FILTER (WHERE surgery_category = '재수술' AND included AND NOT is_lens) AS reop_laser,
    COUNT(*) FILTER (WHERE surgery_category = '재수술' AND included AND is_lens)     AS reop_lens,

    -- 집계
    COUNT(DISTINCT patient_key) FILTER (WHERE surgery_category = '시력교정') AS vision_patients,
    COUNT(*)                    FILTER (WHERE surgery_category = '백내장')   AS cataract_patients,
    COUNT(DISTINCT patient_key) FILTER (WHERE surgery_category = '시력교정')
      + COUNT(*)                FILTER (WHERE surgery_category = '백내장')
      + COUNT(*)                FILTER (WHERE surgery_category = '재수술' AND included)
                                                                            AS total
  FROM v_all_surgery_list
 WHERE surgery_date >= CAST(:from AS DATE)
   AND surgery_date <= CAST(:to   AS DATE)
 GROUP BY surgery_date
 ORDER BY surgery_date
