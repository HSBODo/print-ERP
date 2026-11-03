-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/surgery/select-surgery-list.sql
-- 이관 이력: 2026-09-29 A4-2 (SurgeryMartJob 배치 read-side · list_surgery).
--
-- 방언 변환 요약:
--   OPERATIONDATA → raw.raw_crm_operationdata
--   Cataract_Operationdata → raw.raw_crm_cataract_operationdata
--   EXAM → raw.raw_crm_exam
--   Cataract_Exam → raw.raw_crm_cataract_exam
--   RESERVATION → raw.raw_crm_reservation
--   CUSTOM → raw.raw_crm_custom
--   EMPLOYEE → raw.raw_crm_employee (ec/ed/eo/os 4개 alias)
--   NationCustom_CFG → raw.raw_crm_nationcustom_cfg
--   EtcCfg → raw.raw_crm_etccfg
--   MOTIVE_NEW01/02 → raw.raw_crm_motive_new01/02
--   COSTPRICE → raw.raw_crm_costprice
--   ISNULL(x, y) → COALESCE(x, y)
--   OUTER APPLY (SELECT TOP 1 ...) → LEFT JOIN LATERAL (SELECT ... LIMIT 1) ... ON true
--   OUTER APPLY (SELECT ...) → CROSS JOIN LATERAL (SELECT ...) (컴퓨트-only 서브쿼리)
--   REPLACE(CONVERT(varchar(30), CONVERT(money, x), 1), '.00', '')
--     → REPLACE(TO_CHAR(x, 'FM999,999,999,990.00'), '.00', '')
--   LEN → LENGTH
--   문자열 + → ||
--   CONVERT(varchar(10), m2.[section]) → m2.section::text
--   N'문자열' → '문자열'
--   WITH(NOLOCK) → 제거
--
-- ⚠️ alias double-quote 필수 (Writer 가 row.get("chartNo") case-sensitive).
WITH cataract_ops AS (
  SELECT
    x.cust_num,
    x.operation_date,
    MAX(x.operationr) AS operationr,
    MAX(x.operationl) AS operationl,
    MAX(x.operation_doc) AS operation_doc
  FROM (
    SELECT
      c.cust_num,
      c.operationr_date AS operation_date,
      COALESCE(c.operationr, '') AS operationr,
      '' AS operationl,
      COALESCE(c.operationr_doc, '') AS operation_doc
    FROM raw.raw_crm_cataract_operationdata c
    WHERE COALESCE(c.operationr_date, '') <> ''
      AND COALESCE(c.operationr, '') <> ''
      AND COALESCE(c.operationr, '') NOT IN ('X','OP불가','TEST-TEST')

    UNION ALL

    SELECT
      c.cust_num,
      c.operationl_date AS operation_date,
      '' AS operationr,
      COALESCE(c.operationl, '') AS operationl,
      COALESCE(c.operationl_doc, '') AS operation_doc
    FROM raw.raw_crm_cataract_operationdata c
    WHERE COALESCE(c.operationl_date, '') <> ''
      AND COALESCE(c.operationl, '') <> ''
      AND COALESCE(c.operationl, '') NOT IN ('X','OP불가','TEST-TEST')
  ) x
  GROUP BY x.cust_num, x.operation_date
),
rows_cte AS (
  SELECT
    '시력교정' AS "surgeryCategory",
    op.cust_num,
    op.operation_date AS "surgeryDate",
    COALESCE(op.operationr, '') AS "surgeryR",
    COALESCE(op.operationl, '') AS "surgeryL",
    COALESCE(op.operation_doc, '') AS "surgeonCode",
    COALESCE(ex.exam_date, '') AS "examDate",
    COALESCE(ex.operationr, '') AS "recommendedR",
    COALESCE(ex.operationl, '') AS "recommendedL",
    COALESCE(ex.op_estimate, '') AS "estimate",
    COALESCE(ex.exampercent, '') AS "surgeryRate",
    COALESCE(ex.exam_memo, '') AS "examMemo"
  FROM raw.raw_crm_operationdata op
  LEFT JOIN LATERAL (
    SELECT e.*
    FROM raw.raw_crm_exam e
    WHERE e.cust_num = op.cust_num
    ORDER BY
      CASE WHEN e.exam_date <= op.operation_date THEN 0 ELSE 1 END,
      e.exam_date DESC
    LIMIT 1
  ) ex ON true
  WHERE op.operation_date >= :from AND op.operation_date <= :to
    -- 시력교정 갈래 포함 조건 (옵션 B+ · 2026-10-08 재검토, docs/점검/수술자리스트-백내장우선룰-재검토_2026-10-08.md)
    -- 세 가지 중 하나라도 참이면 포함:
    --   ① 백내장 환자 아님 (Cataract_Operationdata 레코드 없음)
    --   ② 백내장 환자여도 "제거 수술" 패턴이면 포함
    --      예: 2231981 윤경미 (다른 병원 ICL → B&VIIT 에서 ICL 제거 + 백내장 IOL 전환)
    --      - 10코드 재검토 문서(§6.3) CRM 입력 혼선과 같은 패턴
    --   ③ 과거 백내장 + 지금 다른 날 시력교정 재수술 (미래 대비, 2026-10 시점 발생 0건)
    --      같은 날 Cataract 가 없으면 "별개 수술" 로 간주.
    --      운영 혼선(같은 수술을 다른 날짜로 입력) 발생 시 중복 집계 리스크 — 월간 모니터링 필요.
    AND (
      NOT EXISTS (
        SELECT 1
        FROM raw.raw_crm_cataract_operationdata cod
        WHERE cod.cust_num = op.cust_num
      )
      OR op.operationr LIKE 'remo%' OR op.operationl LIKE 'remo%'
      OR op.operationr LIKE '%제거%' OR op.operationl LIKE '%제거%'
      OR op.operationr LIKE 'ICL explant%' OR op.operationl LIKE 'ICL explant%'
      OR op.operationr LIKE '%removal%' OR op.operationl LIKE '%removal%'
      OR NOT EXISTS (
        SELECT 1
        FROM raw.raw_crm_cataract_operationdata cod
        WHERE cod.cust_num = op.cust_num
          AND (cod.operationr_date = op.operation_date
               OR cod.operationl_date = op.operation_date)
      )
    )
    AND (
      (COALESCE(op.operationr, '') <> '' AND op.operationr NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
      OR
      (COALESCE(op.operationl, '') <> '' AND op.operationl NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
    )

  UNION ALL

  SELECT
    '백내장' AS "surgeryCategory",
    co.cust_num,
    co.operation_date AS "surgeryDate",
    COALESCE(co.operationr, '') AS "surgeryR",
    COALESCE(co.operationl, '') AS "surgeryL",
    COALESCE(co.operation_doc, '') AS "surgeonCode",
    COALESCE(ce.exam_date, '') AS "examDate",
    COALESCE(ce.operationr, '') AS "recommendedR",
    COALESCE(ce.operationl, '') AS "recommendedL",
    COALESCE(
      COALESCE(ce.op_estimate_r, '') ||
      CASE WHEN COALESCE(ce.op_estimate_l, '') <> '' THEN '/' || ce.op_estimate_l ELSE '' END
    , '') AS "estimate",
    '' AS "surgeryRate",
    COALESCE(ce.exam_memo, '') AS "examMemo"
  FROM cataract_ops co
  LEFT JOIN LATERAL (
    SELECT ce.*
    FROM raw.raw_crm_cataract_exam ce
    WHERE ce.cust_num = co.cust_num
    ORDER BY
      CASE WHEN ce.exam_date <= co.operation_date THEN 0 ELSE 1 END,
      ce.exam_date DESC,
      ce.seq DESC
    LIMIT 1
  ) ce ON true
  WHERE co.operation_date >= :from AND co.operation_date <= :to
)
SELECT
  COALESCE(LTRIM(RTRIM(cu.cust_num)), '') AS "chartNo",
  COALESCE(cu.cust_name, '') AS "name",
  COALESCE(cu.cust_ename, '') AS "nameEng",
  rows_cte."surgeryCategory",
  COALESCE(rows_cte."surgeryDate", '') AS "surgeryDate",
  COALESCE(rows_cte."examDate", '') AS "examDate",
  CASE WHEN COALESCE(cu.first_day, '') >= :from AND COALESCE(cu.first_day, '') <= :to
       THEN '신환' ELSE '구환' END AS "patientType",
  COALESCE(rsv.reserve_date, '') AS "surgeryReserveDate",
  COALESCE(rsvReg."regDate", '') AS "surgeryRegDate",
  COALESCE(rsv.start_time, '') AS "surgeryTime",
  COALESCE(rows_cte."surgeryR", '') AS "surgeryR",
  COALESCE(rows_cte."surgeryL", '') AS "surgeryL",
  COALESCE(rows_cte."recommendedR", '') AS "recommendedR",
  COALESCE(rows_cte."recommendedL", '') AS "recommendedL",
  COALESCE(rows_cte."estimate", '') AS "estimate",
  COALESCE(rows_cte."surgeryRate", '') AS "surgeryRate",
  COALESCE(
    REPLACE(
      TO_CHAR(NULLIF(pay.receipt, 0), 'FM999,999,999,990.00'),
      '.00', ''
    ), ''
  ) AS "payment",
  COALESCE(os.emp_name, '') AS "surgeon",
  COALESCE(ec.emp_name, '') AS "counselor",
  COALESCE(ed.emp_name, '') AS "doctor",
  COALESCE(eo.emp_name, '') AS "optometrist",
  COALESCE(cu.birth_day, '') AS "birth",
  CASE WHEN cu.lunar_yn = 'Y' THEN '음' ELSE '양' END AS "lunar",
  COALESCE(cu.call_num1, '') AS "phone1",
  COALESCE(cu.call_num2, '') AS "phone2",
  COALESCE(cu.email, '') AS "email",
  COALESCE(LTRIM(RTRIM(cu.zip_code)), '') AS "zip",
  COALESCE(cu.addr1, '') AS "addr1",
  COALESCE(cu.addr2, '') AS "addr2",
  COALESCE(cu.etc, '') AS "memo",
  COALESCE(cu.level, '') AS "grade",
  COALESCE(cu.job, '') AS "job",
  COALESCE(cu.last_day, '') AS "lastVisit",
  COALESCE(rsv.reserve_path, '') AS "route",
  COALESCE(motive.section, '') AS "section",
  COALESCE(motive."motiveL", '') AS "motiveL",
  COALESCE(motive."motiveM", '') AS "motiveM",
  COALESCE(motive."motiveS", '') AS "motiveS",
  COALESCE(motive."motiveMemo", '') AS "motiveMemo",
  COALESCE(rows_cte."examMemo", '') AS "examMemo",
  COALESCE(ins.etccodnam, '') AS "insurance",
  COALESCE(nation.nation_codename, '') AS "nationality"
FROM rows_cte
JOIN raw.raw_crm_custom cu ON rows_cte.cust_num = cu.cust_num
LEFT JOIN raw.raw_crm_employee ec ON cu.my_counselor = ec.emp_num
LEFT JOIN raw.raw_crm_employee ed ON cu.my_doctor = ed.emp_num
LEFT JOIN raw.raw_crm_employee eo ON cu.my_optometrist = eo.emp_num
LEFT JOIN raw.raw_crm_employee os ON rows_cte."surgeonCode" = os.emp_num
LEFT JOIN raw.raw_crm_nationcustom_cfg nation ON cu.nation_code = nation.code
LEFT JOIN raw.raw_crm_etccfg ins
  ON ins.etcbsecod = 'InsuranceCfg'
 AND ins.etccod = cu.insurancecode
LEFT JOIN LATERAL (
  SELECT r.*
  FROM raw.raw_crm_reservation r
  WHERE r.cust_num = rows_cte.cust_num
    AND r.reserve_flag = 'O'
    AND r.reserve_state <> 'C'
  ORDER BY
    CASE WHEN r.reserve_date = rows_cte."surgeryDate" THEN 0 ELSE 1 END,
    r.reserve_date DESC,
    r.reserve_num DESC
  LIMIT 1
) rsv ON true
CROSS JOIN LATERAL (
  SELECT CASE WHEN LENGTH(LTRIM(RTRIM(COALESCE(rsv.reserve_num, '')))) >= 6
              THEN '20' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 1 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 3 FOR 2)
                 || '-' || SUBSTRING(LTRIM(RTRIM(rsv.reserve_num)) FROM 5 FOR 2)
              ELSE '' END AS "regDate"
) rsvReg
LEFT JOIN LATERAL (
  SELECT
    COALESCE(m2.category01_name, '') AS "motiveL",
    COALESCE(m2.category02_name, '') AS "motiveM",
    COALESCE(m2.category03_name, '') AS "motiveS",
    COALESCE(NULLIF(m1.comments, ''), COALESCE(m2.name, '')) AS "motiveMemo",
    COALESCE(m2.section::text, '') AS section
  FROM raw.raw_crm_motive_new02 m2
  LEFT JOIN raw.raw_crm_motive_new01 m1 ON m2.fkey = m1.pkey
  -- ⚠️ TRIM 양쪽: motive_new02(23) vs rows_cte(operationdata 13 뿌리).
  -- docs/data-platform/varchar-padding-trim-audit.md §6.2 #7
  WHERE TRIM(m2.cust_num) = TRIM(rows_cte.cust_num) AND m2.idx = '1'
  ORDER BY m2.pkey DESC
  LIMIT 1
) motive ON true
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(cp.cost_price, 0)) AS receipt
  FROM raw.raw_crm_costprice cp
  WHERE cp.cust_num = rows_cte.cust_num
    AND cp.cost_date = rows_cte."surgeryDate"
    AND UPPER(COALESCE(cp.paystt, '')) <> 'A'
) pay ON true
WHERE COALESCE(cu.cust_name, '') NOT LIKE '%테스트%'
  AND LOWER(COALESCE(cu.cust_name, '')) NOT LIKE '%test%'
ORDER BY rows_cte."surgeryDate", rsv.start_time, cu.cust_name, rows_cte."surgeryCategory"
