-- 차트번호로 수술 환자 1명 조회 — 발송 대상 수동 추가 시 정보 자동 채움용.
-- 시력교정·백내장(list_surgery)과 재수술(list_reoperation)을 함께 보고 **가장 최근 수술**을 쓴다
-- (안내 문자는 최근 수술 기준). 재수술 원천에는 연락처가 없어 같은 차트번호의 수술 기록에서 끌어온다.
SELECT
    x."chartNo", x."name", x."surgeryType", x."opType", x."surgeryR", x."surgeryL",
    TO_CHAR(x.d, 'YYYY-MM-DD') AS "surgeryDate",
    x."phone"
FROM (
    SELECT
        COALESCE(chart_no, '')              AS "chartNo",
        COALESCE(name, '')                  AS "name",
        COALESCE(surgery_category, '')      AS "surgeryType",
        COALESCE(
            surgery_op_type(NULLIF(surgery_r, ''), surgery_category = '백내장'),
            surgery_op_type(NULLIF(surgery_l, ''), surgery_category = '백내장'),
            '')                             AS "opType",
        COALESCE(surgery_r, '')             AS "surgeryR",
        COALESCE(surgery_l, '')             AS "surgeryL",
        surgery_date                        AS d,
        COALESCE(
            CASE
                WHEN REPLACE(COALESCE(phone1, ''), '-', '') LIKE '010%' THEN phone1
                WHEN REPLACE(COALESCE(phone2, ''), '-', '') LIKE '010%' THEN phone2
                WHEN COALESCE(phone1, '') <> '' THEN phone1
                ELSE phone2
            END, '')                        AS "phone"
      FROM list_surgery
     WHERE REPLACE(TRIM(COALESCE(chart_no, '')), '-', '') = :chartNo

    UNION ALL

    SELECT
        COALESCE(r.chart_no, ''),
        COALESCE(r.name, ''),
        '재수술',
        CASE WHEN r.is_lens THEN 'reopLens' ELSE 'reopLaser' END,
        COALESCE(r.again_r, ''),
        COALESCE(r.again_l, ''),
        r.reop_date,
        COALESCE(
            (SELECT CASE
                        WHEN REPLACE(COALESCE(s.phone1, ''), '-', '') LIKE '010%' THEN s.phone1
                        WHEN REPLACE(COALESCE(s.phone2, ''), '-', '') LIKE '010%' THEN s.phone2
                        WHEN COALESCE(s.phone1, '') <> '' THEN s.phone1
                        ELSE s.phone2
                    END
               FROM list_surgery s
              WHERE s.chart_no = r.chart_no
                AND COALESCE(NULLIF(s.phone1, ''), NULLIF(s.phone2, '')) IS NOT NULL
              ORDER BY s.surgery_date DESC
              LIMIT 1),
            (SELECT v.hp
               FROM list_reservation v
              WHERE v.chart_no = r.chart_no
                AND COALESCE(v.hp, '') <> ''
              ORDER BY v.registered_at DESC
              LIMIT 1),
            '')
      FROM list_reoperation r
      LEFT JOIN reoperation_decision d
             ON d.chart_no = r.chart_no
            AND d.op_date  = r.reop_date
            AND d.againr   = r.again_r
            AND d.againl   = r.again_l
     WHERE REPLACE(TRIM(COALESCE(r.chart_no, '')), '-', '') = :chartNo
       AND COALESCE(d.is_reoperation, r.auto_included = 1)
) x
ORDER BY x.d DESC
LIMIT 1
