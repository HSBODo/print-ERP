-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/exam/select-exam-list.sql
-- 이관 이력: 2026-09-30 A5-2 (ExamMartJob 배치 read-side · list_exam · 최대 규모 SQL).
--
-- 방언 변환 요약:
--   테이블: EXAM·CUSTOM·OPERATIONDATA·EMPLOYEE·RESERVATION·CANCEL_CFG·NationCustom_CFG·
--          EtcCfg·MEDICAL_SUB_CFG·MOTIVE_NEW01/02·COSTPRICE·CSTPRCSUB·PRCITMLST·PrcItmDtl·
--          Cataract_Exam → raw.raw_crm_<lower>
--   ISNULL → COALESCE
--   OUTER APPLY (SELECT TOP 1) → LEFT JOIN LATERAL (SELECT ... LIMIT 1) ON true
--   OUTER APPLY (SELECT ...) → CROSS JOIN LATERAL (SELECT ...) (컴퓨트-only)
--   N'문자열' → '문자열'
--   WITH(NOLOCK) → 제거
--   LEN → LENGTH
--   문자열 + → ||
--   CONVERT(money) → TO_CHAR / m2.[section] → m2.section::text
--
-- ⚠️ alias double-quote 필수 (Writer 가 row.get("chartNo") case-sensitive).
-- ⚠️ 30개 검사값 NULL 체크 chain (RIGHT01~30/LEFT01~30) — 모두 COALESCE 변환.
-- ⚠️ 성능: 6개 LATERAL + pay 대형 UNION 3-way. §10.1 인덱스 필수.
SELECT
  COALESCE(LTRIM(RTRIM(cu.cust_num)), '')       AS "chartNo",
  COALESCE(cu.cust_name, '')                    AS "name",
  COALESCE(cu.cust_ename, '')                   AS "nameEng",
  COALESCE(e.exam_date, '')                     AS "examDate",
  COALESCE(
    NULLIF(LTRIM(RTRIM(ms.sub_name)), ''),
    CASE
      WHEN COALESCE(rsv.reserve_jinryo,'')='1' THEN '검사'
      WHEN COALESCE(rsv.reserve_jinryo,'')='5' THEN '검사OP'
      WHEN COALESCE(rsv.reserve_jinryo,'')='4' THEN 'DNA검사'
      WHEN COALESCE(rsv.reserve_jinryo,'')='2' THEN '재검사'
      WHEN COALESCE(rsv.reserve_jinryo,'')='6' THEN '당일재검사'
      WHEN COALESCE(rsv.reserve_jinryo,'')='7' THEN '검사OP(Re)'
      ELSE COALESCE(rsv.reserve_jinryo, '')
    END
  )                                             AS "examType",
  CASE WHEN visit."hasDreamlens" = 1 AND visit."hasMedical" = 0 THEN '드림렌즈' ELSE '시력교정' END AS "examCategory",
  -- 원데이 검사: 같은날 검사OP(M/5) 또는 검사OP(Re)(M/7) 예약 내원.
  CASE WHEN COALESCE(e.exam_memo, '') NOT LIKE '%테스트%'
        AND LOWER(COALESCE(e.exam_memo, '')) NOT LIKE '%test%'
        AND EXISTS (SELECT 1 FROM raw.raw_crm_reservation r5
                    WHERE r5.cust_num = e.cust_num AND r5.reserve_date = e.exam_date
                      AND r5.reserve_flag = 'M' AND r5.reserve_jinryo IN ('5','7') AND r5.reserve_state IN ('I','H'))
       THEN 'Y' ELSE 'N' END                    AS "oneDay",
  CASE WHEN COALESCE(cu.first_day, '') >= :from AND COALESCE(cu.first_day, '') <= :to
       THEN '신환' ELSE '구환' END              AS "patientType",
  COALESCE(rsvReg."regDate", '')                AS "examRegDate",
  COALESCE(e.exam_memo, '')                     AS "examMemo",
  COALESCE(e.op_estimate, '')                   AS "estimate",
  COALESCE(e.exampercent, '')                   AS "surgeryRate",
  COALESCE(rsv.start_time, '')                  AS "examTime",
  COALESCE(e.operationr, '')                    AS "recommendedR",
  COALESCE(e.operationl, '')                    AS "recommendedL",
  COALESCE(opReg."regDate", '')                 AS "surgeryRegDate",
  COALESCE(opRsv.reserve_date, '')              AS "surgeryReserveDate",
  COALESCE(op.operation_date, '')               AS "surgeryDate",
  COALESCE(op.operationr, '')                   AS "surgeryR",
  COALESCE(op.operationl, '')                   AS "surgeryL",
  COALESCE(os.emp_name, '')                     AS "surgeon",
  COALESCE(
    REPLACE(
      TO_CHAR(NULLIF(pay.receipt, 0), 'FM999,999,999,990.00'),
      '.00', ''
    ), ''
  )                                             AS "payment",
  COALESCE(ec.emp_name, '')                     AS "counselor",
  COALESCE(ed.emp_name, '')                     AS "doctor",
  ''                                            AS "jumin",
  COALESCE(cu.birth_day, '')                    AS "birth",
  CASE WHEN cu.lunar_yn = 'Y' THEN '음' ELSE '양' END AS "lunar",
  COALESCE(cu.call_num1, '')                    AS "phone1",
  COALESCE(cu.call_num2, '')                    AS "phone2",
  COALESCE(cu.email, '')                        AS "email",
  COALESCE(LTRIM(RTRIM(cu.zip_code)), '')       AS "zip",
  COALESCE(cu.addr1, '')                        AS "addr1",
  COALESCE(cu.addr2, '')                        AS "addr2",
  COALESCE(cu.etc, '')                          AS "memo",
  COALESCE(e.stop_yn, '')                       AS "examStop",
  COALESCE(e.op_possible_yn, '')                AS "opImpossible",
  COALESCE(rsv.reserve_path, '')                AS "route",
  COALESCE(motive.section, '')                  AS "section",
  COALESCE(motive."motiveL", '')                AS "motiveL",
  COALESCE(motive."motiveM", '')                AS "motiveM",
  COALESCE(motive."motiveS", '')                AS "motiveS",
  COALESCE(motive."motiveMemo", '')             AS "motiveMemo",
  COALESCE(eo.emp_name, '')                     AS "optometrist",
  COALESCE(LTRIM(RTRIM(e.cancel_cd)), '')       AS "cancelCode",
  COALESCE(NULLIF(e.cancel_reason, ''), COALESCE(cc.cancel_reason, '')) AS "cancelMemo",
  COALESCE(cu.level, '')                        AS "grade",
  COALESCE(cu.job, '')                          AS "job",
  COALESCE(cu.last_day, '')                     AS "lastVisit",
  COALESCE(ins.etccodnam, '')                   AS "insurance",
  COALESCE(nation.nation_codename, '')          AS "nationality"
FROM raw.raw_crm_exam e
JOIN raw.raw_crm_custom cu             ON e.cust_num = cu.cust_num
LEFT JOIN raw.raw_crm_operationdata op ON e.cust_num = op.cust_num
LEFT JOIN raw.raw_crm_employee ec      ON cu.my_counselor   = ec.emp_num
LEFT JOIN raw.raw_crm_employee ed      ON cu.my_doctor      = ed.emp_num
LEFT JOIN raw.raw_crm_employee eo      ON cu.my_optometrist = eo.emp_num
LEFT JOIN raw.raw_crm_employee os      ON op.operation_doc  = os.emp_num
LEFT JOIN raw.raw_crm_cancel_cfg cc    ON e.cancel_cd       = cc.cancel_cd
LEFT JOIN raw.raw_crm_nationcustom_cfg nation ON cu.nation_code = nation.code
LEFT JOIN raw.raw_crm_etccfg ins
  ON ins.etcbsecod = 'InsuranceCfg'
 AND ins.etccod = cu.insurancecode
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN EXISTS (
      SELECT 1 FROM raw.raw_crm_reservation rd
      WHERE rd.cust_num = e.cust_num
        AND rd.reserve_date = e.exam_date
        AND rd.reserve_state IN ('I','H')
        AND rd.reserve_flag = 'D'
    ) THEN 1 ELSE 0 END AS "hasDreamlens",
    CASE WHEN EXISTS (
      SELECT 1 FROM raw.raw_crm_reservation rm
      WHERE rm.cust_num = e.cust_num
        AND rm.reserve_date = e.exam_date
        AND rm.reserve_state IN ('I','H')
        AND rm.reserve_flag = 'M'
    ) THEN 1 ELSE 0 END AS "hasMedical",
    -- 수술 연계: 검사일 이후(당일 포함) 수술예약(O, 취소 제외) 또는 수술기록 존재.
    CASE WHEN EXISTS (
      SELECT 1 FROM raw.raw_crm_reservation ro
      WHERE ro.cust_num = e.cust_num
        AND ro.reserve_flag = 'O'
        AND ro.reserve_state <> 'C'
        AND ro.reserve_date >= e.exam_date
    ) OR EXISTS (
      SELECT 1 FROM raw.raw_crm_operationdata od
      WHERE od.cust_num = e.cust_num
        AND COALESCE(od.operation_date, '') <> ''
        AND od.operation_date >= e.exam_date
    ) THEN 1 ELSE 0 END AS "hasSurgeryLink"
) visit
LEFT JOIN LATERAL (
  SELECT r.*
  FROM raw.raw_crm_reservation r
  WHERE r.cust_num = e.cust_num
    AND r.reserve_date = e.exam_date
    AND r.reserve_state IN ('I','H')
    AND r.reserve_flag = 'M'
  ORDER BY r.reserve_num DESC
  LIMIT 1
) rsv ON true
LEFT JOIN raw.raw_crm_medical_sub_cfg ms
  ON ms.reserve_flag = rsv.reserve_flag
 AND ms.sub_flag = COALESCE(rsv.reserve_jinryo, '')
CROSS JOIN LATERAL (
  SELECT CASE WHEN LENGTH(LTRIM(RTRIM(COALESCE(rsv.reserve_num, '')))) >= 6
              THEN '20' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 1 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 3 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 5 FOR 2)
              ELSE '' END AS "regDate"
) rsvReg
LEFT JOIN LATERAL (
  SELECT f.*
  FROM raw.raw_crm_reservation f
  WHERE f.cust_num = e.cust_num AND f.reserve_flag = 'O' AND f.reserve_state <> 'C'
  ORDER BY f.reserve_num DESC
  LIMIT 1
) opRsv ON true
CROSS JOIN LATERAL (
  SELECT CASE WHEN LENGTH(LTRIM(RTRIM(COALESCE(opRsv.reserve_num, '')))) >= 6
              THEN '20' || SUBSTRING(LTRIM(RTRIM(opRsv.reserve_num)) FROM 1 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(opRsv.reserve_num)) FROM 3 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(opRsv.reserve_num)) FROM 5 FOR 2)
              ELSE '' END AS "regDate"
) opReg
LEFT JOIN LATERAL (
  SELECT
    COALESCE(m2.category01_name, '') AS "motiveL",
    COALESCE(m2.category02_name, '') AS "motiveM",
    COALESCE(m2.category03_name, '') AS "motiveS",
    COALESCE(NULLIF(m1.comments, ''), COALESCE(m2.name, '')) AS "motiveMemo",
    COALESCE(m2.section::text, '') AS section
  FROM raw.raw_crm_motive_new02 m2
  LEFT JOIN raw.raw_crm_motive_new01 m1 ON m2.fkey = m1.pkey
  WHERE m2.cust_num = e.cust_num AND m2.idx = '1'
  ORDER BY m2.pkey DESC
  LIMIT 1
) motive ON true
LEFT JOIN (
  SELECT TMP.prc_cusnum, SUM(TMP.receipt) AS receipt
  FROM (
    SELECT A.cust_num AS prc_cusnum,
           SUM(COALESCE(A.cost_price, 0)) AS receipt
    FROM raw.raw_crm_costprice A
    LEFT JOIN (
      SELECT cstcusnum, cstseq
      FROM raw.raw_crm_cstprcsub
      GROUP BY cstcusnum, cstseq
    ) B ON A.cust_num = B.cstcusnum AND A.seq = B.cstseq
    LEFT JOIN (
      SELECT prccusnum, prcseq
      FROM raw.raw_crm_prcitmlst
      GROUP BY prccusnum, prcseq
    ) C ON A.cust_num = C.prccusnum AND A.seq = C.prcseq
    WHERE B.cstcusnum IS NULL
      AND C.prccusnum IS NULL
      AND A.cost_flag IN ('O','I','H')
      AND UPPER(COALESCE(A.paystt, '')) <> 'A'
    GROUP BY A.cust_num

    UNION ALL

    SELECT B.cstcusnum AS prc_cusnum,
           SUM(COALESCE(B.cstprc, 0)) AS receipt
    FROM raw.raw_crm_costprice A
    JOIN raw.raw_crm_cstprcsub B
      ON A.cust_num = B.cstcusnum
     AND A.seq = B.cstseq
     AND A.cost_flag IN ('O','I','H')
     AND B.cstcnlynn = 'N'
     AND B.cstpaytyp = 'N'
    LEFT JOIN raw.raw_crm_prcitmlst C
      ON B.cstcusnum = C.prccusnum
     AND B.cstseq = C.prcseq
    WHERE C.prccusnum IS NULL
      AND UPPER(COALESCE(A.paystt, '')) <> 'A'
    GROUP BY B.cstcusnum

    UNION ALL

    SELECT T2.cust_num AS prc_cusnum,
           SUM(CASE D.prccnlynn WHEN 'Y' THEN 0 ELSE COALESCE(D.prcdtlprc, 0) END) AS receipt
    FROM (
      SELECT DISTINCT A.cust_num, A.seq
      FROM raw.raw_crm_costprice A
      WHERE COALESCE(A.cost_flag, '') = ''
        AND UPPER(COALESCE(A.paystt, '')) <> 'A'
    ) T2
    JOIN raw.raw_crm_prcitmlst C
      ON T2.cust_num = C.prccusnum
     AND T2.seq = C.prcseq
     AND C.prccod IN ('O','I','H')
    JOIN raw.raw_crm_prcitmdtl D
      ON T2.cust_num = D.prccusnum
     AND T2.seq = D.prcseq
     AND D.prccod IN ('O','I','H')
    GROUP BY T2.cust_num
  ) TMP
  GROUP BY TMP.prc_cusnum
) pay ON e.cust_num = pay.prc_cusnum
     AND e.cust_num <> '9999999999999'
WHERE e.exam_date >= :from AND e.exam_date <= :to
  AND COALESCE(cu.cust_name, '') NOT LIKE '%테스트%'
  AND LOWER(COALESCE(cu.cust_name, '')) NOT LIKE '%test%'
  AND NOT (
    EXISTS (
      SELECT 1
      FROM raw.raw_crm_cataract_exam ce
      WHERE ce.cust_num = e.cust_num
        AND ce.exam_date = e.exam_date
    )
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right01, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left01, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right02, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left02, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right03, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left03, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right04, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left04, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right05, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left05, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right06, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left06, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right07, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left07, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right08, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left08, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right09, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left09, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right10, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left10, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right11, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left11, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right12, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left12, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right13, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left13, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right14, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left14, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right15, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left15, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right16, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left16, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right17, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left17, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right18, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left18, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right19, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left19, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right20, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left20, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right21, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left21, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right22, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left22, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right23, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left23, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right24, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left24, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right25, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left25, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right26, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left26, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right27, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left27, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right28, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left28, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right29, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left29, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.right30, ''))), '') IS NULL
    AND NULLIF(LTRIM(RTRIM(COALESCE(e.left30, ''))), '') IS NULL
  )
  -- 순수 외래 유입 제외
  AND NOT (visit."hasMedical" = 0 AND visit."hasDreamlens" = 0 AND visit."hasSurgeryLink" = 0)
  -- 백내장 갈래와 중복 제거
  AND NOT (
    visit."hasMedical" = 0 AND visit."hasDreamlens" = 0
    AND EXISTS (
      SELECT 1 FROM raw.raw_crm_reservation rh
      WHERE rh.cust_num = e.cust_num AND rh.reserve_date = e.exam_date
        AND rh.reserve_flag = 'H'
        AND COALESCE(rh.reserve_jinryo, '') <> '3'
        AND COALESCE(rh.reserve_seq, 0) <> 3
        AND rh.reserve_state NOT IN ('C','Y')
    )
  )
ORDER BY e.exam_date, rsv.reserve_date, rsv.start_time, cu.cust_name
