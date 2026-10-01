-- 데이터 플랫폼(bnviit_datawarehouse) 버전 — data-platform 프로파일에서 사용.
-- MSSQL 원본: sql/softcrm/outpatient/select-outpatient-list.sql
-- 이관 이력: 2026-09-29 A3-2 (OutpatientMartJob 배치 read-side · list_outpatient 적재 소스).
--
-- 방언 변환 요약:
--   RESERVATION → raw.raw_crm_reservation
--   CUSTOM → raw.raw_crm_custom
--   EMPLOYEE → raw.raw_crm_employee (doc·cns·reg 3개 alias)
--   MEDICAL_SUB_CFG → raw.raw_crm_medical_sub_cfg
--   NationCustom_CFG → raw.raw_crm_nationcustom_cfg
--   EtcCfg → raw.raw_crm_etccfg
--   MOTIVE_NEW01/02 → raw.raw_crm_motive_new01/02
--   ISNULL(x, y) → COALESCE(x, y)
--   OUTER APPLY (...TOP 1...) → LEFT JOIN LATERAL (...LIMIT 1) ... ON true
--   CONVERT(varchar(10), m2.[section]) → m2.section::text  (section 은 smallint)
--   N'%테스트%' → '%테스트%'  (Postgres 는 유니코드 접두어 불필요)
--   WITH(NOLOCK) → 제거
--
-- ⚠️ alias 는 반드시 double-quote 로 감쌀 것 — Writer 가 row.get("reserveNum") 을 case-sensitive 로 접근.
--    unquoted 이면 Postgres 폴딩으로 "reservenum" 이 되어 Writer 가 NULL 로 인식.
--
-- ⚠️ 컬럼 확인 완료 (raw-columns.txt):
--   custom.insurancecode (원본 InsuranceCode, 폴딩됨, 언더스코어 없음 주의)
--   custom.nation_code (원본 Nation_code)
--   nationcustom_cfg.nation_codename (원본 Nation_CodeName)
--   etccfg.etcbsecod, etccod, etccodnam (원본 EtcBseCod 등)
--   motive_new02.section (smallint · 원본 [section] bracketed)
--   motive_new02.idx (원본 Idx)
SELECT
  COALESCE(LTRIM(RTRIM(rv.reserve_num)), '')      AS "reserveNum",
  COALESCE(rv.reserve_date, '')                   AS "reserveDate",
  COALESCE(rv.start_time, '')                     AS "reserveTime",
  COALESCE(rv.end_time, '')                       AS "endTime",
  CASE rv.reserve_state
    WHEN 'I' THEN '내원'
    WHEN 'H' THEN '퇴원'
    ELSE COALESCE(rv.reserve_state, '')
  END                                             AS "state",
  COALESCE(rv.reserve_state, '')                  AS "stateCode",
  COALESCE(
    NULLIF(LTRIM(RTRIM(ms.sub_name)), ''),
    COALESCE(rv.reserve_jinryo, '')
  )                                               AS "reserveType",
  COALESCE(rv.reserve_jinryo, '')                 AS "reserveJinryoCode",
  CASE WHEN COALESCE(cu.first_day, '') >= :from AND COALESCE(cu.first_day, '') <= :to
       THEN '신환' ELSE '구환' END                AS "patientType",
  COALESCE(rv.old_flag, '')                       AS "oldFlag",
  COALESCE(rv.today_flag, '')                     AS "todayFlag",
  COALESCE(rv.happycall_flag, '')                 AS "happyCall",
  COALESCE(LTRIM(RTRIM(cu.cust_num)), '')         AS "chartNo",
  COALESCE(cu.cust_name, '')                      AS "name",
  COALESCE(cu.cust_ename, '')                     AS "nameEng",
  COALESCE(cu.level, '')                          AS "grade",
  COALESCE(cu.birth_day, '')                      AS "birth",
  CASE WHEN cu.lunar_yn = 'Y' THEN '음' ELSE '양' END AS "lunar",
  COALESCE(cu.call_num1, '')                      AS "phone1",
  COALESCE(cu.call_num2, '')                      AS "phone2",
  COALESCE(cu.email, '')                          AS "email",
  COALESCE(LTRIM(RTRIM(cu.zip_code)), '')         AS "zip",
  COALESCE(cu.addr1, '')                          AS "addr1",
  COALESCE(cu.addr2, '')                          AS "addr2",
  COALESCE(doc.emp_name, '')                      AS "doctor",
  COALESCE(cns.emp_name, '')                      AS "counselor",
  COALESCE(reg.emp_name, '')                      AS "registeredBy",
  COALESCE(rv.comment, '')                        AS "comment",
  COALESCE(rv.reserve_path, '')                   AS "route",
  COALESCE(motive.section, '')                    AS "section",
  COALESCE(motive."motiveL", '')                  AS "motiveL",
  COALESCE(motive."motiveM", '')                  AS "motiveM",
  COALESCE(motive."motiveS", '')                  AS "motiveS",
  COALESCE(motive."motiveMemo", '')               AS "motiveMemo",
  COALESCE(cu.job, '')                            AS "job",
  COALESCE(cu.last_day, '')                       AS "lastVisit",
  COALESCE(ins.etccodnam, '')                     AS "insurance",
  COALESCE(nation.nation_codename, '')            AS "nationality",
  COALESCE(cu.etc, '')                            AS "memo"
FROM raw.raw_crm_reservation rv
JOIN raw.raw_crm_custom cu ON rv.cust_num = cu.cust_num
LEFT JOIN raw.raw_crm_employee doc
  ON doc.emp_num = COALESCE(NULLIF(rv.select_doc, ''), rv.reserve_doc)
 AND doc.emp_state <> 'N'
LEFT JOIN raw.raw_crm_employee cns
  ON cns.emp_num = rv.reserve_emp
 AND cns.emp_state <> 'N'
LEFT JOIN raw.raw_crm_employee reg
  ON reg.emp_num = rv.register_emp
 AND reg.emp_state <> 'N'
LEFT JOIN raw.raw_crm_medical_sub_cfg ms
  ON ms.reserve_flag = rv.reserve_flag
 AND ms.sub_flag = COALESCE(rv.reserve_jinryo, '')
LEFT JOIN raw.raw_crm_nationcustom_cfg nation ON cu.nation_code = nation.code
LEFT JOIN raw.raw_crm_etccfg ins
  ON ins.etcbsecod = 'InsuranceCfg'
 AND ins.etccod = cu.insurancecode
LEFT JOIN LATERAL (
  SELECT
    COALESCE(m2.category01_name, '') AS "motiveL",
    COALESCE(m2.category02_name, '') AS "motiveM",
    COALESCE(m2.category03_name, '') AS "motiveS",
    COALESCE(NULLIF(m1.comments, ''), COALESCE(m2.name, '')) AS "motiveMemo",
    COALESCE(m2.section::text, '') AS section
  FROM raw.raw_crm_motive_new02 m2
  LEFT JOIN raw.raw_crm_motive_new01 m1 ON m2.fkey = m1.pkey
  WHERE m2.cust_num = rv.cust_num AND m2.idx = '1'
  ORDER BY m2.pkey DESC
  LIMIT 1
) motive ON true
WHERE rv.reserve_date >= :from AND rv.reserve_date <= :to
  AND rv.reserve_flag = 'F'
  AND rv.reserve_state IN ('I','H')
  AND COALESCE(cu.cust_name, '') NOT LIKE '%테스트%'
  AND LOWER(COALESCE(cu.cust_name, '')) NOT LIKE '%test%'
ORDER BY rv.reserve_date, rv.start_time, cu.cust_name
