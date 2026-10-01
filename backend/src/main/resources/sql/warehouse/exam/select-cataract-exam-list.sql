-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/exam/select-cataract-exam-list.sql
-- 이관 이력: 2026-09-30 A5-1 (ExamMartJob 배치 read-side · list_cataract_exam).
--
-- 방언 변환 요약:
--   테이블: CUSTOM·RESERVATION·EMPLOYEE·Cataract_Exam·Cataract_Operationdata·CANCEL_CFG·
--          NationCustom_CFG·EtcCfg·MEDICAL_SUB_CFG·MOTIVE_NEW01/02·COSTPRICE·CSTPRCSUB·
--          PRCITMLST·PrcItmDtl → raw.raw_crm_<lower>
--   ISNULL(x, y) → COALESCE(x, y)
--   CROSS APPLY (SELECT ...) → CROSS JOIN LATERAL (SELECT ...)
--   OUTER APPLY (SELECT TOP 1 ...) → LEFT JOIN LATERAL (SELECT ... LIMIT 1) ... ON true
--   OUTER APPLY (SELECT ...) → CROSS JOIN LATERAL (SELECT ...) (컴퓨트-only)
--   N'문자열' → '문자열'
--   WITH(NOLOCK) → 제거
--   LEN → LENGTH
--   문자열 + → ||
--   CONVERT(varchar(30), CONVERT(money, x), 1) → TO_CHAR(x, 'FM999,999,999,990.00')
--   CONVERT(varchar(10), m2.[section]) → m2.section::text
--   m2.[section] → m2.section
--
-- ⚠️ alias double-quote 필수 (Writer 가 row.get("chartNo") case-sensitive).
-- ⚠️ 컬럼 확인 완료 (raw-columns.txt) — 모든 참조 컬럼 folding 매핑 확인.
--
-- ⚠️ 성능: 6개 LATERAL 서브쿼리 + pay 대형 UNION 3-way 서브쿼리. §10.1 인덱스 요청 참조.
SELECT
  COALESCE(LTRIM(RTRIM(cu.cust_num)), '')       AS "chartNo",
  COALESCE(cu.cust_name, '')                    AS "name",
  COALESCE(cu.cust_ename, '')                   AS "nameEng",
  COALESCE(CH."examDate", '')                   AS "examDate",
  COALESCE(
    NULLIF(LTRIM(RTRIM(ms.sub_name)), ''),
    CASE WHEN COALESCE(LTRIM(RTRIM(rsv.reserve_flag)),'') = 'H' THEN '백내장검사' ELSE '' END
  )                                             AS "examType",
  COALESCE(rsvReg."regDate", '')                AS "examRegDate",
  '백내장'                                       AS "examCategory",
  CH."classification"                           AS "classification",
  -- 원데이(백내장) — 그 날 백내장검사 예약 진료구분이 C_원데이(7)·C_노안원데이(9)면 Y.
  CASE WHEN CH."isOneDay" = 1 THEN 'Y' ELSE 'N' END AS "oneDay",
  CASE WHEN COALESCE(cu.first_day, '') >= :from AND COALESCE(cu.first_day, '') <= :to
       THEN '신환' ELSE '구환' END              AS "patientType",
  COALESCE(ce.exam_memo, '')                    AS "examMemo",
  LTRIM(RTRIM(
    CASE
      WHEN COALESCE(NULLIF(LTRIM(RTRIM(ce.op_estimate_r)),'0'),'') <> ''
       AND COALESCE(NULLIF(LTRIM(RTRIM(ce.op_estimate_l)),'0'),'') <> ''
      THEN 'R ' || LTRIM(RTRIM(ce.op_estimate_r)) || ' / L ' || LTRIM(RTRIM(ce.op_estimate_l))
      WHEN COALESCE(NULLIF(LTRIM(RTRIM(ce.op_estimate_r)),'0'),'') <> '' THEN LTRIM(RTRIM(ce.op_estimate_r))
      WHEN COALESCE(NULLIF(LTRIM(RTRIM(ce.op_estimate_l)),'0'),'') <> '' THEN LTRIM(RTRIM(ce.op_estimate_l))
      ELSE '' END
  ))                                            AS "estimate",
  COALESCE(ce.exampercent, '')                  AS "surgeryRate",
  COALESCE(rsv.start_time, '')                  AS "examTime",
  COALESCE(ce.operationr, '')                   AS "recommendedR",
  COALESCE(ce.operationl, '')                   AS "recommendedL",
  COALESCE(opReg."regDate", '')                 AS "surgeryRegDate",
  COALESCE(opRsv.reserve_date, '')              AS "surgeryReserveDate",
  COALESCE(COALESCE(NULLIF(LTRIM(RTRIM(op.operationr_date)),''), NULLIF(LTRIM(RTRIM(op.operationl_date)),'')), '') AS "surgeryDate",
  COALESCE(op.operationr, '')                   AS "surgeryR",
  COALESCE(op.operationl, '')                   AS "surgeryL",
  COALESCE(COALESCE(NULLIF(LTRIM(RTRIM(osr.emp_name)),''), NULLIF(LTRIM(RTRIM(osl.emp_name)),'')), '') AS "surgeon",
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
  COALESCE(LTRIM(RTRIM(ce.stop_yn)), '')        AS "examStop",
  COALESCE(LTRIM(RTRIM(ce.impossible)), '')     AS "opImpossible",
  COALESCE(rsv.reserve_path, '')                AS "route",
  COALESCE(motive.section, '')                  AS "section",
  COALESCE(motive."motiveL", '')                AS "motiveL",
  COALESCE(motive."motiveM", '')                AS "motiveM",
  COALESCE(motive."motiveS", '')                AS "motiveS",
  COALESCE(motive."motiveMemo", '')             AS "motiveMemo",
  COALESCE(eo.emp_name, '')                     AS "optometrist",
  COALESCE(LTRIM(RTRIM(ce.cancel_cd)), '')      AS "cancelCode",
  COALESCE(NULLIF(ce.cancel_reason, ''), COALESCE(cc.cancel_reason, '')) AS "cancelMemo",
  COALESCE(cu.level, '')                        AS "grade",
  COALESCE(cu.job, '')                          AS "job",
  COALESCE(cu.last_day, '')                     AS "lastVisit",
  COALESCE(ins.etccodnam, '')                   AS "insurance",
  COALESCE(nation.nation_codename, '')          AS "nationality"
FROM (
  SELECT B.cust_num,
         D.reserve_date AS "examDate",
         -- 그 날 예약이 여러 건이면 하나라도 원데이면 원데이로 본다(MAX).
         MAX(CASE WHEN COALESCE(D.reserve_jinryo, '') IN ('7', '9') THEN 1 ELSE 0 END) AS "isOneDay",
         CASE WHEN opt.v = 1 AND B.my_counselor = 'BS0808' THEN '중단'
              WHEN opt.v = 1 AND cns.v = 1                 THEN '백내장'
              WHEN B.my_counselor = 'BS0808'               THEN '노안/FU'
              ELSE '기타' END AS "classification"
  FROM raw.raw_crm_custom B
  JOIN raw.raw_crm_reservation D ON D.cust_num = B.cust_num
  CROSS JOIN LATERAL (SELECT CASE WHEN EXISTS (SELECT 1 FROM raw.raw_crm_employee E
                                                WHERE E.emp_num = B.my_optometrist) THEN 1 ELSE 0 END AS v) opt
  CROSS JOIN LATERAL (SELECT CASE WHEN EXISTS (SELECT 1 FROM raw.raw_crm_employee E
                                                WHERE E.emp_num = B.my_counselor)   THEN 1 ELSE 0 END AS v) cns
  WHERE D.reserve_date >= :from AND D.reserve_date <= :to
    AND D.reserve_flag = 'H'
    AND COALESCE(D.reserve_jinryo, '') <> '3'
    AND COALESCE(D.reserve_seq, 0) <> 3
    AND D.reserve_state NOT IN ('C', 'Y')
    AND B.cust_num <> '9999999999999'
    AND COALESCE(B.cust_name, '') NOT LIKE '%테스트%'
    AND LOWER(COALESCE(B.cust_name, '')) NOT LIKE '%test%'
  GROUP BY B.cust_num, D.reserve_date,
           CASE WHEN opt.v = 1 AND B.my_counselor = 'BS0808' THEN '중단'
                WHEN opt.v = 1 AND cns.v = 1                 THEN '백내장'
                WHEN B.my_counselor = 'BS0808'               THEN '노안/FU'
                ELSE '기타' END
) CH
JOIN raw.raw_crm_custom cu ON cu.cust_num = CH.cust_num
LEFT JOIN LATERAL (
  SELECT c.*
  FROM raw.raw_crm_cataract_exam c
  WHERE c.cust_num = CH.cust_num
    AND c.exam_date >= :from AND c.exam_date <= :to
  ORDER BY CASE WHEN c.exam_date = CH."examDate" THEN 0 ELSE 1 END, c.exam_date, c.seq DESC
  LIMIT 1
) ce ON true
LEFT JOIN raw.raw_crm_cataract_operationdata op ON op.cust_num = CH.cust_num
LEFT JOIN raw.raw_crm_employee osr               ON op.operationr_doc = osr.emp_num
LEFT JOIN raw.raw_crm_employee osl               ON op.operationl_doc = osl.emp_num
LEFT JOIN raw.raw_crm_employee ec                ON cu.my_counselor   = ec.emp_num
LEFT JOIN raw.raw_crm_employee ed                ON cu.my_doctor      = ed.emp_num
LEFT JOIN raw.raw_crm_employee eo                ON cu.my_optometrist = eo.emp_num
LEFT JOIN raw.raw_crm_cancel_cfg cc              ON ce.cancel_cd      = cc.cancel_cd
LEFT JOIN raw.raw_crm_nationcustom_cfg nation    ON cu.nation_code    = nation.code
LEFT JOIN raw.raw_crm_etccfg ins
  ON ins.etcbsecod = 'InsuranceCfg' AND ins.etccod = cu.insurancecode
LEFT JOIN LATERAL (
  SELECT r.reserve_flag, r.reserve_jinryo, r.start_time, r.reserve_path, r.reserve_num
  FROM raw.raw_crm_reservation r
  WHERE r.cust_num = CH.cust_num AND r.reserve_date = CH."examDate"
    AND r.reserve_state NOT IN ('C','Y') AND r.reserve_flag = 'H'
  ORDER BY r.reserve_num DESC
  LIMIT 1
) rsv ON true
LEFT JOIN raw.raw_crm_medical_sub_cfg ms
  ON ms.reserve_flag = rsv.reserve_flag AND ms.sub_flag = COALESCE(rsv.reserve_jinryo, '')
CROSS JOIN LATERAL (
  SELECT CASE WHEN LENGTH(LTRIM(RTRIM(COALESCE(rsv.reserve_num, '')))) >= 6
              THEN '20' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 1 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 3 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 5 FOR 2)
              ELSE '' END AS "regDate"
) rsvReg
LEFT JOIN LATERAL (
  SELECT f.reserve_date, f.reserve_num
  FROM raw.raw_crm_reservation f
  WHERE f.cust_num = CH.cust_num AND f.reserve_flag = 'O'
    AND f.reserve_jinryo = '4'            -- 백내장 수술만(레거시 기준). 미지정 시 시력교정 수술예약이 섞임
    AND f.reserve_state <> 'C'
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
  WHERE m2.cust_num = CH.cust_num AND m2.idx = '1'
  ORDER BY m2.pkey DESC
  LIMIT 1
) motive ON true
LEFT JOIN (
  SELECT TMP.prc_cusnum, SUM(TMP.receipt) AS receipt
  FROM (
    SELECT A.cust_num AS prc_cusnum, SUM(COALESCE(A.cost_price, 0)) AS receipt
    FROM raw.raw_crm_costprice A
    LEFT JOIN (SELECT cstcusnum, cstseq FROM raw.raw_crm_cstprcsub GROUP BY cstcusnum, cstseq) B
      ON A.cust_num = B.cstcusnum AND A.seq = B.cstseq
    LEFT JOIN (SELECT prccusnum, prcseq FROM raw.raw_crm_prcitmlst GROUP BY prccusnum, prcseq) C
      ON A.cust_num = C.prccusnum AND A.seq = C.prcseq
    WHERE B.cstcusnum IS NULL AND C.prccusnum IS NULL
      AND A.cost_flag IN ('O','I','H') AND UPPER(COALESCE(A.paystt, '')) <> 'A'
    GROUP BY A.cust_num
    UNION ALL
    SELECT B.cstcusnum AS prc_cusnum, SUM(COALESCE(B.cstprc, 0)) AS receipt
    FROM raw.raw_crm_costprice A
    JOIN raw.raw_crm_cstprcsub B
      ON A.cust_num = B.cstcusnum AND A.seq = B.cstseq
     AND A.cost_flag IN ('O','I','H') AND B.cstcnlynn = 'N' AND B.cstpaytyp = 'N'
    LEFT JOIN raw.raw_crm_prcitmlst C ON B.cstcusnum = C.prccusnum AND B.cstseq = C.prcseq
    WHERE C.prccusnum IS NULL AND UPPER(COALESCE(A.paystt, '')) <> 'A'
    GROUP BY B.cstcusnum
    UNION ALL
    SELECT T2.cust_num AS prc_cusnum,
           SUM(CASE D.prccnlynn WHEN 'Y' THEN 0 ELSE COALESCE(D.prcdtlprc, 0) END) AS receipt
    FROM (SELECT DISTINCT A.cust_num, A.seq FROM raw.raw_crm_costprice A
          WHERE COALESCE(A.cost_flag, '') = '' AND UPPER(COALESCE(A.paystt, '')) <> 'A') T2
    JOIN raw.raw_crm_prcitmlst C ON T2.cust_num = C.prccusnum AND T2.seq = C.prcseq AND C.prccod IN ('O','I','H')
    JOIN raw.raw_crm_prcitmdtl D ON T2.cust_num = D.prccusnum AND T2.seq = D.prcseq AND D.prccod IN ('O','I','H')
    GROUP BY T2.cust_num
  ) TMP
  GROUP BY TMP.prc_cusnum
) pay ON pay.prc_cusnum = CH.cust_num AND CH.cust_num <> '9999999999999'
ORDER BY CH."examDate", rsv.start_time, cu.cust_name
