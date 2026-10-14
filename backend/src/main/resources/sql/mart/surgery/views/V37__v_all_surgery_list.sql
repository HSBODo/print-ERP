-- =========================================================
-- 전체 수술 뷰 (V37) — list_surgery + list_reoperation 의 단일 정의
-- Profile: postgres-mart
--
-- 왜 뷰인가.
--   수술 유형 분류가 MSSQL 쿼리 4벌(시력교정 월별/일별 · 백내장 월별/일별)에
--   복제돼 있었고, 주석에 "둘은 같은 기준이어야 한다"고 사람이 지켜야 할 규약으로만
--   적혀 있었다. 실제로 어긋났다 — 2026-06 백내장이 리스트 62 vs 집계 65.
--   v_all_exam_list(V34) 와 같은 방식으로 정의를 한 곳에 모은다.
--
-- ★ 집계 단위 — 화면 원칙이 여기서 갈린다.
--     리스트 행  = 사람 (수술자 리스트가 보여주는 것)
--     표시 숫자  = 안   (백내장 수술수)
--   그래서 이 뷰는 **눈 단위 행**으로 펼치고, 집계에서 갈라 쓴다:
--     시력교정 수술수 = COUNT(DISTINCT patient_key)   -- 사람×수술일
--     백내장   수술수 = COUNT(*)                       -- 안
--     재수술          = COUNT(*) WHERE included        -- 건
--     총 수술수       = 위 셋의 합 (2026-07: 784 + 45 + 32 = 861)
--   ⚠️ 총 수술수에는 같은 사람·같은 날이 수술과 재수술에 각각 잡히는 중복이 있다
--      (렌즈 제거+삽입처럼 한 세션이 두 테이블에 기록된 경우). 레거시도 같은 방식으로
--      더하므로 걸러내지 않는다 — 이게 확정된 정의다.
--
-- 저장하지 않는다 — 원본 행은 list_surgery / list_reoperation 에 이미 있고
-- 이 뷰는 그 위의 파생 규칙일 뿐이다. 새 표도 새 배치도 없다.
--
-- ⚠️ 파생 규칙을 바꾸면 여기만 고친다. 리스트·월별·주차가 함께 따라온다.
-- ⚠️ 뷰에는 2026-01 이후 행만 있다(그 전은 마트에 리스트가 없다).
--    그리고 배치는 2026-06 부터만 쓴다(SurgeryMartJob.MART_LIVE_FROM).
--    2024·2025 는 V15, 2026-01~05 는 V35 확정값이 정본이라 이 뷰와 무관하다.
-- ⚠️ 재수술의 렌즈/레이저(is_lens)는 적재 시점에 자바가 계산해 넣은 값이다.
--    시술명 패턴의 SSOT 는 ReoperationOverlay.LENS_PATTERNS — 여기서 다시 판정하지 않는다.
--
-- ⚠️⚠️ 패턴 매칭은 반드시 ILIKE 로 쓴다 (LIKE 아님).
--    원본 MSSQL 의 DB collation 이 Korean_Wansung_CI_AS = **대소문자 무시**라
--    거기서는 LIKE 가 이미 CI 로 동작한다. Postgres LIKE 는 CS 라 그대로 옮기면 분류가 갈린다.
--    실제로 겪었다 — 'T-Tecnis Puresee'(소문자 s)가 패턴 '%PureSee%' 에 안 걸려
--    catEdof 대신 catMono 로 떨어졌다(2026-07 EDOF 22→21, Mono 2→3).
--    시술명은 사람이 손으로 입력해 대소문자가 제각각이므로 CI 가 맞다.
--    같은 이유로 제외 목록도 UPPER() 비교를 쓴다('op x' vs 'OP X').
-- =========================================================

CREATE OR REPLACE VIEW v_all_surgery_list AS
WITH
-- 1) 시력교정·백내장을 눈 단위로 펼친다.
--    list_surgery 1행 = (사람, 수술일, 구분) 이고 좌·우 시술명을 각각 컬럼으로 갖는다.
--    백내장에서 양안을 같은 날 수술하면 1행이 2안이 된다 — 2026-06 의 62행 vs 65안이 이것이다.
eyes AS (
    SELECT surgery_date, chart_no, name, surgery_category,
           'R'::text AS eye, 1 AS eye_rank, surgery_r AS op_name
      FROM list_surgery
     WHERE COALESCE(surgery_r, '') <> ''
       AND UPPER(surgery_r) NOT IN ('X', 'OP불가', '모든수술가능', 'OP X', 'STRABISMUS', 'TEST-TEST')
    UNION ALL
    SELECT surgery_date, chart_no, name, surgery_category,
           'L'::text, 2, surgery_l
      FROM list_surgery
     WHERE COALESCE(surgery_l, '') <> ''
       AND UPPER(surgery_l) NOT IN ('X', 'OP불가', '모든수술가능', 'OP X', 'STRABISMUS', 'TEST-TEST')
),
-- 2) 눈별 유형 분류. MSSQL 4벌의 CASE 를 여기 한 곳으로 모은 것이며 순서까지 그대로다.
--    순서가 곧 우선순위다 — 예: 'Mono+PRESBYOND' 는 노안, 'T-ICL' 은 tIcl(ICL 보다 먼저).
typed AS (
    SELECT e.*,
           CASE WHEN e.surgery_category = '백내장' THEN
                CASE
                    WHEN e.op_name ILIKE '%EDOF%' OR e.op_name ILIKE '%Vivity%'
                      OR e.op_name ILIKE '%Eyhance%' OR e.op_name ILIKE '%PureSee%'
                      OR e.op_name ILIKE '%Isopure%' OR e.op_name ILIKE '%Symfony%' THEN 'catEdof'
                    WHEN e.op_name ILIKE '%K-flex%' OR e.op_name ILIKE '%Kflex%' THEN 'catMono'
                    WHEN e.op_name ILIKE '%Clareon%' OR e.op_name ILIKE '%Panoptix%'
                      OR e.op_name ILIKE '%RESTOR%' OR e.op_name ILIKE '%Lara%'
                      OR e.op_name ILIKE '%LISA%' OR e.op_name ILIKE '%CTR(M)%'
                      OR e.op_name ILIKE '%CTRmulti%' OR e.op_name ILIKE '%CTR(multi)%'
                      OR e.op_name ILIKE '%3PodF%' OR e.op_name ILIKE '%T-CTR%'
                      OR e.op_name ILIKE '%T-CATARACT%' OR e.op_name ILIKE '%Precizon%'
                      OR e.op_name ILIKE '%LAL%' OR e.op_name ILIKE '%ELANA%'
                      OR e.op_name ILIKE '%Gemetric%' THEN 'catMulti'
                    ELSE 'catMono'
                END
           ELSE
                CASE
                    -- PRESBYOND 를 맨 앞에 — 'Mono+PRESBYOND' 처럼 섞여 들어와도 노안으로 잡는다.
                    WHEN e.op_name ILIKE '%PRESBYOND%' THEN 'presbyond'
                    WHEN e.op_name ILIKE '%SMILE Pro%' OR e.op_name ILIKE '%SMILEpro%'
                      OR e.op_name ILIKE '%SMILE PRO%' THEN 'smilePro'
                    WHEN e.op_name ILIKE '%SMILE%' THEN 'smile'
                    WHEN e.op_name ILIKE '%VIVA%' THEN 'viva'
                    -- ⚠️ remo/제거 패턴은 ICL 집계에서 분리 (2026-10-13, V47 함수와 동일 규칙)
                    WHEN e.op_name ILIKE '%remo%' OR e.op_name ILIKE '%제거%' THEN 'other'
                    WHEN e.op_name ILIKE '%T-ICL%' OR e.op_name ILIKE '%T-IPCL%'
                      OR e.op_name ILIKE '%T-GLAZE%' OR e.op_name ILIKE '%T-ECHO%' THEN 'tIcl'
                    WHEN e.op_name ILIKE '%ICL%' OR e.op_name ILIKE '%IPCL%'
                      OR e.op_name ILIKE '%ARF%' OR e.op_name ILIKE '%ART%'
                      OR e.op_name ILIKE '%ARTIFLEX%' OR e.op_name ILIKE '%GLAZE%'
                      OR e.op_name ILIKE '%ECHO%' THEN 'icl'
                    WHEN e.op_name ILIKE '%T-KPL%' THEN 'tKpl'
                    WHEN e.op_name ILIKE '%KPL%' THEN 'kpl'
                    WHEN e.op_name ILIKE '%FLAP LIFT%' OR e.op_name ILIKE '%OPTI%'
                      OR e.op_name ILIKE '%iFS%' OR e.op_name ILIKE '%VISU%'
                      OR e.op_name ILIKE '%fs200%' OR e.op_name ILIKE '%Fs200%'
                      OR e.op_name ILIKE '%Micro+%' OR e.op_name ILIKE '%Hybrid%' THEN 'lasik'
                    WHEN e.op_name ILIKE '%EYECLE%' OR e.op_name ILIKE '%T-prk%'
                      OR e.op_name ILIKE '%EYE CLE%' OR e.op_name ILIKE '%EYE+%'
                      OR e.op_name ILIKE '%FLAP PRK%' OR e.op_name ILIKE '%PtK%'
                      OR e.op_name ILIKE '%M-LE%' THEN 'lasek'
                    ELSE 'other'
                END
           END AS op_type
      FROM eyes e
)
-- 3) 시력교정·백내장
SELECT
    t.surgery_date,
    t.chart_no,
    t.name,
    t.surgery_category,
    t.eye,
    t.op_name,
    t.op_type,
    -- 사람×수술일 식별자. 시력교정 수술수는 이걸로 DISTINCT 를 센다.
    t.chart_no || '|' || t.surgery_date::text AS patient_key,
    -- PIOL 대표유형 — 양안에 서로 다른 렌즈를 넣은 환자를 유형마다 세면
    -- 합이 실인원보다 커진다(2026-07: 양쪽 계상 168 vs 실인원 148, 혼합 20명).
    -- 우안(eye_rank=1) 우선으로 환자당 1건만 대표로 삼는다. PIOL 여부로 파티션을 갈라
    -- 비-PIOL 행의 번호가 섞이지 않게 한다. 대표유형 규칙은 PIOL 그룹 안에서만 적용한다.
    (ROW_NUMBER() OVER (
        PARTITION BY t.surgery_date, t.chart_no,
                     CASE WHEN t.op_type IN ('icl','tIcl','kpl','tKpl','viva') THEN 1 ELSE 0 END
        ORDER BY t.eye_rank
    ) = 1) AS is_piol_primary,
    -- 부가시술 — 원문 패턴 매칭. 환자 단위로 DISTINCT 세는 항목들이다.
    (t.op_name ILIKE '%+X%')   AS addon_xtra,
    (t.op_name ILIKE '%W.V%')  AS addon_wave_vision,
    (t.op_name ILIKE 'MONO%')  AS addon_mono_vision,
    (t.op_name ILIKE '%CONT%') AS addon_contra,
    (t.op_name ILIKE '%P.E%')  AS addon_personal,
    (t.op_name ILIKE '%EYECLE%' AND t.op_name ILIKE '%EX500%') AS addon_lasek_ex,
    (t.op_name ILIKE '%EYECLE%' AND t.op_name ILIKE '%RED%')   AS addon_lasek_red,
    FALSE AS is_lens,
    TRUE  AS included
  FROM typed t

UNION ALL

-- 4) 재수술 — 별도 원천(RE_OPERATION)이라 눈으로 펼치지 않고 건 단위로 둔다.
--    included 는 저장 판정(reoperation_decision) 우선, 없으면 자동판정.
--    조회 시점에 조인하므로 화면에서 판정을 고치면 배치 없이 바로 반영된다.
--    ⚠️ reoperation_decision 의 컬럼명은 again_r/again_l 이 아니라 againr/againl 이다.
SELECT
    r.reop_date AS surgery_date,
    r.chart_no,
    r.name,
    '재수술'::varchar(20) AS surgery_category,
    ''::text AS eye,
    NULLIF(TRIM(BOTH ' ' FROM r.again_r || ' ' || r.again_l), '') AS op_name,
    CASE WHEN r.is_lens THEN 'reopLens' ELSE 'reopLaser' END AS op_type,
    r.chart_no || '|' || r.reop_date::text AS patient_key,
    FALSE AS is_piol_primary,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
    r.is_lens,
    COALESCE(d.is_reoperation, r.auto_included = 1) AS included
  FROM list_reoperation r
  LEFT JOIN reoperation_decision d
         ON d.chart_no = r.chart_no
        AND d.op_date  = r.reop_date
        AND d.againr   = r.again_r
        AND d.againl   = r.again_l;
