-- 문자 발송 대상 자동 등록용 — 기간 내 수술 완료자.
--
-- ★ 안내 문구가 있는 4개 수술 그룹만 가져온다. (고객케어 TF 확정안 v5)
--     스마일수술  smilePro · smile
--     라식        lasik  (PRESBYOND 계열 중 '+LE' 미포함분 포함, 아래 재분류 참조)
--     라섹        lasek  (PRESBYOND 계열 중 '+LE' 포함분 포함, 아래 재분류 참조)
--     렌즈삽입    icl · tIcl · kpl · tKpl · viva
--   백내장(catMulti·catEdof·catMono) · 재수술은 **적재하지 않는다** —
--   보낼 문구가 없어서 목록에만 쌓이고 발송은 안 되는 행이 되기 때문이다.
--   화면이 발송 대상만 담아야 "몇 명에게 나가나"를 그대로 읽을 수 있다.
--
-- ⚠️ 그래서 재수술(list_reoperation) 원천을 통째로 뺐다. 문구가 확정되면
--    다시 UNION 으로 붙이면 되고, 그때 SurgeryGroup 에 그룹을 추가한다.
--
-- ⚠️ 그룹 목록을 여기에 문자열로 박아 두었다. SurgeryGroup(자바)과 두 벌이 되므로
--    그룹을 늘릴 때 **양쪽을 함께** 고쳐야 한다. SmsDomainRulesTest 가 이 불일치를 잡는다.
--
-- ⚠️ PRESBYOND 재분류 — **SMS 발송 판정에만** 적용되는 국지 규칙 (2026-09-08).
--    통계·리스트·수술별 비중 등 다른 화면은 presbyond op_type 을 그대로 쓴다.
--    여기서만 '+LE' 유무로 라섹(포함) / 라식(미포함) 에 흡수한다. 두 대안(전면 재분류
--    또는 유지) 사이에서 SMS 커버리지 확장만 취하는 선택이다.
--    자세한 배경: docs/presbyond-reclassification.md
SELECT
    COALESCE(chart_no, '')            AS "chartNo",
    COALESCE(name, '')                AS "name",
    COALESCE(surgery_category, '')    AS "surgeryType",
    -- 수술 종류(스마일프로·ICL·백내장(다초점)…) — 분류 규칙은 surgery_op_type() 하나뿐이라
    -- 수술 통계·채널 분석과 항상 같은 기준이다. 대표는 우안 우선(없으면 좌안).
    -- 다만 PRESBYOND 는 SMS 발송에서만 '+LE' 유무로 라섹(포함) / 라식(미포함) 으로
    -- 재분류한다 (파일 머리 주석 참조). 다른 화면은 그대로 presbyond op_type 을 쓴다.
    CASE
        WHEN (COALESCE(surgery_r, '') ILIKE '%PRESBYOND%' OR COALESCE(surgery_l, '') ILIKE '%PRESBYOND%')
             AND (COALESCE(surgery_r, '') ILIKE '%+LE%' OR COALESCE(surgery_l, '') ILIKE '%+LE%')
            THEN 'lasek'
        WHEN COALESCE(surgery_r, '') ILIKE '%PRESBYOND%' OR COALESCE(surgery_l, '') ILIKE '%PRESBYOND%'
            THEN 'lasik'
        ELSE COALESCE(
            surgery_op_type(NULLIF(surgery_r, ''), surgery_category = '백내장'),
            surgery_op_type(NULLIF(surgery_l, ''), surgery_category = '백내장'),
            '')
    END                               AS "opType",
    COALESCE(surgery_r, '')           AS "surgeryR",
    COALESCE(surgery_l, '')           AS "surgeryL",
    TO_CHAR(surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
    COALESCE(
        CASE
            WHEN REPLACE(COALESCE(phone1, ''), '-', '') LIKE '010%' THEN phone1
            WHEN REPLACE(COALESCE(phone2, ''), '-', '') LIKE '010%' THEN phone2
            WHEN COALESCE(phone1, '') <> '' THEN phone1
            ELSE phone2
        END, '')                      AS "phone"
  FROM list_surgery
 WHERE surgery_date >= CAST(:from AS DATE)
   AND surgery_date <= CAST(:to   AS DATE)
   -- 안내 문구가 있는 그룹만. 대표 종류(우안 우선)로 판정한다.
   -- PRESBYOND 는 위 opType 재분류로 라섹/라식이 되므로 함께 포함시킨다 (짝을 이룬다).
   AND (
       COALESCE(
           surgery_op_type(NULLIF(surgery_r, ''), surgery_category = '백내장'),
           surgery_op_type(NULLIF(surgery_l, ''), surgery_category = '백내장'),
           '')
       IN ('smilePro', 'smile', 'lasik', 'lasek', 'icl', 'tIcl', 'kpl', 'tKpl', 'viva')
       OR COALESCE(surgery_r, '') ILIKE '%PRESBYOND%'
       OR COALESCE(surgery_l, '') ILIKE '%PRESBYOND%'
   )
 ORDER BY "surgeryDate", "chartNo"
