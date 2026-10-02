-- 예약통계_백내장 드릴다운 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/reservation/stats/select-cataract-drill-down.sql — 채널 정의는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 (2026-09-30).
WITH
CH_CALL AS (
  SELECT DISTINCT
    CASE
      WHEN a.ctigbncod='S' AND a.ctictgcod='9' AND a.ctidtlcod1=21 AND a.ctidtlcod2=21 AND a.ctidtlcod3=28 AND COALESCE(b.clgiof,'I')='I' THEN '백내장_재문의'
      WHEN a.ctigbncod='A' AND a.ctictgcod='H' AND a.ctidtlcod1=10 AND a.ctidtlcod2=31 THEN '백내장_추가예약'
      WHEN (a.ctigbncod='A' AND a.ctictgcod='H' AND a.ctidtlcod1=10 AND a.ctidtlcod2 IN (28,32))
        OR (a.ctigbncod='S' AND a.ctictgcod='9' AND a.ctidtlcod1=21 AND a.ctidtlcod2=41)
        OR (a.ctigbncod='M' AND a.ctictgcod='H' AND a.ctidtlcod1= 7 AND a.ctidtlcod2= 5) THEN '백내장_신환'
      WHEN a.ctigbncod='S' AND a.ctictgcod='9' AND a.ctidtlcod1=21
        AND ((a.ctidtlcod2=21 AND (a.ctidtlcod3<>28 OR a.ctidtlcod3 IS NULL)) OR a.ctidtlcod2 IN (32,9)) THEN '백내장_신규문의'
      ELSE '' END AS gb,
    '' AS gb2,
    TO_CHAR(a.ctirgtdtm, 'YYYY-MM-DD') AS reserve_date,
    CAST(a.cticallid AS VARCHAR)       AS pk,
    '' AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    '' AS "exclusionReasonCandidate"
  FROM raw.raw_crm_ctirptlst a
  LEFT JOIN raw.raw_crm_cticlg b ON a.cticallid = b.clgnum
  WHERE a.ctirgtdtm >= CAST(:date AS timestamp)
    AND a.ctirgtdtm <  CAST(:date AS date) + INTERVAL '1 day'
    AND ((a.ctictgcod='H' AND a.ctidtlcod1 IN (10,7)) OR (a.ctictgcod='9' AND a.ctidtlcod1=21))
),
CH_KAKAO AS (
  SELECT DISTINCT
    CASE WHEN c01.name='백내장검사' AND c02.name LIKE '★신환%' THEN '카톡_검사예약'
         WHEN c02.name='노안'      THEN '카톡_노안'
         WHEN c02.name='예약취소'  THEN '카톡_취소'
         ELSE '카톡_문의' END AS gb,
    '' AS gb2,
    TO_CHAR(h.inserteddatetime, 'YYYY-MM-DD')             AS reserve_date,
    TO_CHAR(h.inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS') AS pk,
    '' AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    '' AS "exclusionReasonCandidate"
  FROM raw.raw_crm_happytalk_counsel_list h
  LEFT JOIN raw.raw_crm_happytalk_mapping m ON h.happytalk_num = m.happytalk_num
  INNER JOIN raw.raw_crm_happytalk_category01 c01 ON c01.seq = h.category01
  LEFT JOIN raw.raw_crm_happytalk_category02 c02 ON c02.pkey = h.category02 AND c02.fkey = h.category01
  WHERE h.inserteddatetime >= CAST(:date AS timestamp)
    AND h.inserteddatetime <  CAST(:date AS date) + INTERVAL '1 day'
    AND c01.name IN ('백내장검사','백내장외래')
),
CH_RES AS (
  SELECT DISTINCT
    '백내장_온라인예약' AS gb,
    '' AS gb2,
    TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD') AS reserve_date,
    CAST(r.reserve_num AS VARCHAR)             AS pk,
    COALESCE(CAST(r.cust_num AS VARCHAR), '')     AS "custNum",
    COALESCE(CAST(r.reserve_num AS VARCHAR), '')  AS "reserveNum",
    COALESCE(r.reserve_state, '')                 AS "reserveState",
    CASE
      WHEN COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' THEN '테스트'
      WHEN r.cust_num='8888888888888' THEN '더미고객'
      WHEN r.reserve_jinryo='16' THEN '노안외래'
      WHEN r.reserve_state='C' THEN '취소'
      ELSE ''
    END AS "exclusionReasonCandidate"
  FROM raw.raw_crm_reservation r
  WHERE r.inserteddatetime >= CAST(:date AS timestamp)
    AND r.inserteddatetime <  CAST(:date AS date) + INTERVAL '1 day'
    AND r.reserve_flag='H' AND r.reserve_state<>'C' AND r.reserve_jinryo<>'16'
    AND r.reserve_path IN ('ONLINE','APP','NAVER')
    AND r.cust_num<>'8888888888888'
    AND NOT (r.cust_name LIKE '%테스트%' OR r.cust_name LIKE '%TEST%')
),
CH_VISIT AS (
  SELECT DISTINCT
    CASE WHEN r.reserve_state='Y' AND r.reserve_date < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') THEN '백내장_부도'
         WHEN r.reserve_state='C' THEN '백내장_취소' END AS gb,
    CASE WHEN r.reserve_path IN ('ONLINE','APP','NAVER') THEN 'ONLINE' ELSE 'CRM' END AS gb2,
    r.reserve_date                                AS reserve_date,
    CAST(r.reserve_num AS VARCHAR)                 AS pk,
    COALESCE(CAST(r.cust_num AS VARCHAR), '')     AS "custNum",
    COALESCE(CAST(r.reserve_num AS VARCHAR), '')  AS "reserveNum",
    COALESCE(r.reserve_state, '')                 AS "reserveState",
    CASE
      WHEN COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' THEN '테스트'
      WHEN r.cust_num='8888888888888' THEN '더미고객'
      WHEN r.reserve_jinryo='13' THEN '수술당일'
      WHEN r.reserve_jinryo='16' THEN '노안외래'
      ELSE ''
    END AS "exclusionReasonCandidate"
  FROM raw.raw_crm_reservation r
  INNER JOIN raw.raw_crm_reserve_history rh ON r.reserve_num = rh.reserve_num
  WHERE r.reserve_date >= :date AND r.reserve_date <= :date
    AND r.reserve_flag='H' AND r.reserve_jinryo NOT IN ('16','13') AND rh.memo='예약저장'
    AND r.cust_num<>'8888888888888'
    AND NOT (r.cust_name LIKE '%테스트%' OR r.cust_name LIKE '%TEST%')
),
CH_EXAM AS (
  SELECT DISTINCT '백내장_내원' AS gb, '' AS gb2,
    r.reserve_date                 AS reserve_date,
    CAST(r.reserve_num AS VARCHAR) AS pk,
    COALESCE(CAST(r.cust_num AS VARCHAR), '')     AS "custNum",
    COALESCE(CAST(r.reserve_num AS VARCHAR), '')  AS "reserveNum",
    COALESCE(r.reserve_state, '')                 AS "reserveState",
    CASE
      WHEN COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' THEN '테스트'
      WHEN r.cust_num='8888888888888' THEN '더미고객'
      ELSE ''
    END AS "exclusionReasonCandidate"
  FROM raw.raw_crm_reservation r
  WHERE r.reserve_date >= :date AND r.reserve_date <= :date
    AND r.reserve_flag='H' AND r.reserve_state IN ('I','H')
    AND r.cust_num<>'8888888888888'
    AND NOT (r.cust_name LIKE '%테스트%' OR r.cust_name LIKE '%TEST%')
    AND ( r.reserve_jinryo IN ('1','2')
       OR EXISTS (SELECT 1 FROM raw.raw_crm_cataract_exam e
                  WHERE LTRIM(RTRIM(e.cust_num)) = LTRIM(RTRIM(r.cust_num))
                    AND e.exam_date = r.reserve_date AND COALESCE(e.stop_yn,'') <> 'Y') )
),
CH_TM AS (
  SELECT DISTINCT
    CASE WHEN tm_gubun='1000' THEN 'TM_예약'
         WHEN tm_gubun='2000' THEN 'TM_유효'
         ELSE 'TM_DB' END AS gb,
    '' AS gb2,
    TO_CHAR(assign_date, 'YYYY-MM-DD') AS reserve_date,
    CAST(dbcust_num AS VARCHAR)         AS pk,
    CAST(dbcust_num AS VARCHAR)         AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    CASE WHEN COALESCE(gubun,'') LIKE 'B2B%' THEN 'B2B' ELSE '' END AS "exclusionReasonCandidate"
  FROM raw.raw_crm_db_custom
  WHERE assign_date >= CAST(:date AS timestamp)
    AND assign_date <  CAST(:date AS date) + INTERVAL '1 day'
    AND tm_emp IN ('KC0307','BV1119','BV1207','BV0067')
    AND COALESCE(gubun,'') NOT LIKE 'B2B%'
),
CH_ALL AS (
  SELECT 'CH_CALL' AS source, gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_CALL
  UNION ALL SELECT 'CH_KAKAO',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_KAKAO
  UNION ALL SELECT 'CH_RES',    gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_RES
  UNION ALL SELECT 'CH_VISIT',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_VISIT
  UNION ALL SELECT 'CH_EXAM',   gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_EXAM
  UNION ALL SELECT 'CH_TM',     gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_TM
),
DETAIL AS (
  SELECT
    CH.reserve_date AS d,
    FIELD_MAP.field,
    CH.source,
    CH.gb  AS gb,
    CH.gb2 AS gb2,
    CH.pk  AS "primaryKey",
    CH."custNum",
    CH."reserveNum",
    CH."reserveState",
    CH."exclusionReasonCandidate",
    FIELD_MAP.contribution
  FROM CH_ALL CH
  CROSS JOIN LATERAL (VALUES
    ('totalCataract',              CASE WHEN CH.gb IN ('백내장_신환','백내장_추가예약','카톡_검사예약','백내장_온라인예약','TM_예약') THEN 1 ELSE 0 END),
    ('newExamInquiry',             CASE WHEN CH.gb IN ('백내장_신규문의','백내장_신환') THEN 1 ELSE 0 END),
    ('newReInquiry',               CASE WHEN CH.gb='백내장_재문의' THEN 1 ELSE 0 END),
    ('newPatient',                 CASE WHEN CH.gb IN ('백내장_신환','백내장_추가예약') THEN 1 ELSE 0 END),
    ('tmTotalDb',                  CASE WHEN CH.gb IN ('TM_예약','TM_유효','TM_DB') THEN 1 ELSE 0 END),
    ('tmValidDb',                  CASE WHEN CH.gb IN ('TM_예약','TM_유효') THEN 1 ELSE 0 END),
    ('tmReservation',              CASE WHEN CH.gb='TM_예약' THEN 1 ELSE 0 END),
    ('kakaoTotalInquiry',          CASE WHEN CH.gb IN ('카톡_검사예약','카톡_노안','카톡_취소','카톡_문의') THEN 1 ELSE 0 END),
    ('kakaoCataractReservation',   CASE WHEN CH.gb='카톡_검사예약' THEN 1 ELSE 0 END),
    ('kakaoPresbyopiaReservation', CASE WHEN CH.gb='카톡_노안' THEN 1 ELSE 0 END),
    ('onlineReservation',          CASE WHEN CH.gb='백내장_온라인예약' THEN 1 ELSE 0 END),
    ('onlineNoShow',               CASE WHEN CH.gb='백내장_부도' THEN 1 ELSE 0 END),
    ('cancelOnline',               CASE WHEN CH.gb='백내장_취소' AND CH.gb2='ONLINE' THEN 1 ELSE 0 END),
    ('cancelCrm',                  CASE WHEN CH.gb='백내장_취소' AND CH.gb2='CRM' THEN 1 ELSE 0 END),
    ('cancelKakao',                CASE WHEN CH.gb='카톡_취소' THEN 1 ELSE 0 END),
    ('visit',                      CASE WHEN CH.gb='백내장_내원' THEN 1 ELSE 0 END),
    ('noShowReservation',          CASE WHEN CH.gb='백내장_부도' THEN 1 ELSE 0 END),
    ('cancel',                     CASE WHEN CH.gb='백내장_취소' THEN 1 ELSE 0 END)
  ) AS FIELD_MAP(field, contribution)
  WHERE FIELD_MAP.field = :field AND FIELD_MAP.contribution <> 0
)
SELECT d, field, source, gb, gb2, "primaryKey", "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate", contribution
FROM DETAIL
ORDER BY d, source, "primaryKey", field
