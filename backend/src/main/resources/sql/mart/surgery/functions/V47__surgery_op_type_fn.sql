-- =========================================================
-- 수술 유형 분류 함수 (V47)
-- Profile: postgres-mart
--
-- 왜 함수인가.
--   같은 CASE 가 v_all_surgery_list(V37)에 있었는데, 예약자 리스트에 수술명(surgery_r/l)이
--   생기면서 예약 채널 쪽에서도 같은 분류가 필요해졌다. 그대로 복사하면 정의가 두 벌이 되고
--   — 오늘 종일 걷어낸 바로 그 문제다 — 한쪽만 고쳐서 조용히 어긋난다.
--   함수 하나로 두고 두 뷰가 호출한다. 규칙을 바꾸면 여기만 고친다.
--
-- ⚠️ 반드시 ILIKE 를 쓴다(LIKE 아님).
--    원본 MSSQL 의 collation 이 Korean_Wansung_CI_AS = 대소문자 무시라 거기서는 LIKE 가
--    이미 CI 로 동작한다. Postgres LIKE 는 CS 라 그대로 옮기면 분류가 갈린다.
--    실제로 겪었다 — 'T-Tecnis Puresee'(소문자 s)가 '%PureSee%' 에 안 걸려
--    catEdof 대신 catMono 로 떨어졌다(2026-07 EDOF 22→21).
--    시술명은 사람이 손으로 입력해 대소문자가 제각각이므로 CI 가 맞다.
--
-- ⚠️ CASE 순서가 곧 우선순위다. 'Mono+PRESBYOND' 는 노안, 'T-ICL' 은 tIcl(ICL 보다 먼저),
--    'remo+ICL' 은 other(ICL 보다 먼저).
--    순서를 바꾸면 분류가 통째로 달라진다.
--
-- 변경 이력:
--   2026-10-13: remo/제거 패턴을 ICL 매칭 전에 가로채 'other' 로 분리.
--     운영 월간 레포트 "시술별 ICL" 수치와 맞춤. 2026년 발견 패턴: 'remo+ICL'·'remo+ARF' (2건).
--
-- IMMUTABLE — 같은 입력이면 항상 같은 값이라 인덱스·플래너가 활용할 수 있다.
-- =========================================================

CREATE OR REPLACE FUNCTION surgery_op_type(op_name text, is_cataract boolean)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN op_name IS NULL OR btrim(op_name) = '' THEN NULL
    WHEN is_cataract THEN
      CASE
        WHEN op_name ILIKE '%EDOF%' OR op_name ILIKE '%Vivity%'
          OR op_name ILIKE '%Eyhance%' OR op_name ILIKE '%PureSee%'
          OR op_name ILIKE '%Isopure%' OR op_name ILIKE '%Symfony%' THEN 'catEdof'
        WHEN op_name ILIKE '%K-flex%' OR op_name ILIKE '%Kflex%' THEN 'catMono'
        WHEN op_name ILIKE '%Clareon%' OR op_name ILIKE '%Panoptix%'
          OR op_name ILIKE '%RESTOR%' OR op_name ILIKE '%Lara%'
          OR op_name ILIKE '%LISA%' OR op_name ILIKE '%CTR(M)%'
          OR op_name ILIKE '%CTRmulti%' OR op_name ILIKE '%CTR(multi)%'
          OR op_name ILIKE '%3PodF%' OR op_name ILIKE '%T-CTR%'
          OR op_name ILIKE '%T-CATARACT%' OR op_name ILIKE '%Precizon%'
          OR op_name ILIKE '%LAL%' OR op_name ILIKE '%ELANA%'
          OR op_name ILIKE '%Gemetric%' THEN 'catMulti'
        ELSE 'catMono'
      END
    ELSE
      CASE
        WHEN op_name ILIKE '%PRESBYOND%' THEN 'presbyond'
        WHEN op_name ILIKE '%SMILE Pro%' OR op_name ILIKE '%SMILEpro%'
          OR op_name ILIKE '%SMILE PRO%' THEN 'smilePro'
        WHEN op_name ILIKE '%SMILE%' THEN 'smile'
        WHEN op_name ILIKE '%VIVA%' THEN 'viva'
        -- ⚠️ remo/제거 패턴 (ICL 제거 등) 은 ICL 집계에서 분리 — 2026-10-13 추가.
        -- 운영과 ICL 수치 맞춤. ICL 계열에만 나타난다는 전제라 ICL/T-ICL 매칭 직전에 둔다.
        -- 다른 수술과 조합되는 패턴 ('remo+SMILE' 등) 이 향후 발견되면 CASE 재검토 필요.
        WHEN op_name ILIKE '%remo%' OR op_name ILIKE '%제거%' THEN 'other'
        WHEN op_name ILIKE '%T-ICL%' OR op_name ILIKE '%T-IPCL%'
          OR op_name ILIKE '%T-GLAZE%' OR op_name ILIKE '%T-ECHO%' THEN 'tIcl'
        WHEN op_name ILIKE '%ICL%' OR op_name ILIKE '%IPCL%'
          OR op_name ILIKE '%ARF%' OR op_name ILIKE '%ART%'
          OR op_name ILIKE '%ARTIFLEX%' OR op_name ILIKE '%GLAZE%'
          OR op_name ILIKE '%ECHO%' THEN 'icl'
        WHEN op_name ILIKE '%T-KPL%' THEN 'tKpl'
        WHEN op_name ILIKE '%KPL%' THEN 'kpl'
        WHEN op_name ILIKE '%FLAP LIFT%' OR op_name ILIKE '%OPTI%'
          OR op_name ILIKE '%iFS%' OR op_name ILIKE '%VISU%'
          OR op_name ILIKE '%fs200%' OR op_name ILIKE '%Fs200%'
          OR op_name ILIKE '%Micro+%' OR op_name ILIKE '%Hybrid%' THEN 'lasik'
        WHEN op_name ILIKE '%EYECLE%' OR op_name ILIKE '%T-prk%'
          OR op_name ILIKE '%EYE CLE%' OR op_name ILIKE '%EYE+%'
          OR op_name ILIKE '%FLAP PRK%' OR op_name ILIKE '%PtK%'
          OR op_name ILIKE '%M-LE%' THEN 'lasek'
        ELSE 'other'
      END
  END
$$;

-- 제외 시술명인지(수술로 세지 않는 값). 두 뷰가 같은 목록을 쓰도록 함께 함수로 둔다.
-- MSSQL 이 CI 라 'op x' 와 'OP X' 가 같이 걸린다 — UPPER 비교로 맞춘다.
CREATE OR REPLACE FUNCTION surgery_name_excluded(op_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT op_name IS NULL
      OR btrim(op_name) = ''
      OR upper(btrim(op_name)) IN ('X', 'OP불가', '모든수술가능', 'OP X', 'STRABISMUS', 'TEST-TEST')
$$;
