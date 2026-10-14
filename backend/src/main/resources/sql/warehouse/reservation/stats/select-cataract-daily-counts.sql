-- 예약통계_백내장 일자별 원시 카운트 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/reservation/stats/select-cataract-daily-counts.sql — 채널 정의·근거·검증은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 (2026-09-30).
WITH
CH_01 AS (
  SELECT TO_CHAR(stat_date, 'YYYY-MM-DD') AS reserve_date,
         SUM(in_total)   AS inbound_call,
         SUM(in_success) AS answered_call
    FROM raw.raw_eicn_stat_user_inbound_bseye
   WHERE stat_date BETWEEN CAST(:from AS date) AND CAST(:to AS date)
     AND dcontext   = 'hunt_context'
     AND group_code = '0016'
   GROUP BY stat_date
),
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
    CAST(a.cticallid AS VARCHAR)       AS pk
  FROM raw.raw_crm_ctirptlst a
  LEFT JOIN raw.raw_crm_cticlg b ON a.cticallid = b.clgnum
  WHERE a.ctirgtdtm >= CAST(:from AS timestamp)
    AND a.ctirgtdtm <  CAST(:to AS date) + INTERVAL '1 day'
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
    TO_CHAR(h.inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS') AS pk
  FROM raw.raw_crm_happytalk_counsel_list h
  LEFT JOIN raw.raw_crm_happytalk_mapping m ON h.happytalk_num = m.happytalk_num
  INNER JOIN raw.raw_crm_happytalk_category01 c01 ON c01.seq = h.category01
  LEFT JOIN raw.raw_crm_happytalk_category02 c02 ON c02.pkey = h.category02 AND c02.fkey = h.category01
  WHERE h.inserteddatetime >= CAST(:from AS timestamp)
    AND h.inserteddatetime <  CAST(:to AS date) + INTERVAL '1 day'
    AND c01.name IN ('백내장검사','백내장외래')
),
CH_RES AS (
  SELECT DISTINCT
    '백내장_온라인예약' AS gb,
    '' AS gb2,
    TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD') AS reserve_date,
    CAST(r.reserve_num AS VARCHAR)             AS pk
  FROM raw.raw_crm_reservation r
  WHERE r.inserteddatetime >= CAST(:from AS timestamp)
    AND r.inserteddatetime <  CAST(:to AS date) + INTERVAL '1 day'
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
    CAST(r.reserve_num AS VARCHAR)                 AS pk
  FROM raw.raw_crm_reservation r
  INNER JOIN raw.raw_crm_reserve_history rh ON r.reserve_num = rh.reserve_num
  WHERE r.reserve_date >= :from
    AND r.reserve_date <= :to
    AND r.reserve_flag='H' AND r.reserve_jinryo NOT IN ('16','13') AND rh.memo='예약저장'
    AND r.cust_num<>'8888888888888'
    AND NOT (r.cust_name LIKE '%테스트%' OR r.cust_name LIKE '%TEST%')
),
CH_EXAM AS (
  SELECT DISTINCT
    '백내장_내원' AS gb,
    '' AS gb2,
    r.reserve_date                 AS reserve_date,
    CAST(r.reserve_num AS VARCHAR) AS pk
  FROM raw.raw_crm_reservation r
  WHERE r.reserve_date >= :from
    AND r.reserve_date <= :to
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
    CAST(dbcust_num AS VARCHAR)         AS pk
  FROM raw.raw_crm_db_custom
  WHERE assign_date >= CAST(:from AS timestamp)
    AND assign_date <  CAST(:to AS date) + INTERVAL '1 day'
    AND tm_emp IN ('KC0307','BV1119','BV1207','BV0067')
    AND COALESCE(gubun,'') NOT LIKE 'B2B%'
),
CH_ALL AS (
  SELECT gb, gb2, pk, reserve_date FROM CH_CALL
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_KAKAO
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_RES
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_VISIT
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_EXAM
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_TM
),
R AS (
  SELECT TO_CHAR(ctirgtdtm, 'YYYY-MM-DD') AS reserve_date, CAST(cticallid AS VARCHAR) AS pk
    FROM raw.raw_crm_ctirptlst
   WHERE ctirgtdtm >= CAST(:from AS timestamp) AND ctirgtdtm < CAST(:to AS date) + INTERVAL '1 day'
  UNION
  SELECT TO_CHAR(inserteddatetime, 'YYYY-MM-DD'), TO_CHAR(inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS')
    FROM raw.raw_crm_happytalk_counsel_list
   WHERE inserteddatetime >= CAST(:from AS timestamp) AND inserteddatetime < CAST(:to AS date) + INTERVAL '1 day'
  UNION
  SELECT TO_CHAR(inserteddatetime, 'YYYY-MM-DD'), CAST(reserve_num AS VARCHAR)
    FROM raw.raw_crm_reservation
   WHERE inserteddatetime >= CAST(:from AS timestamp) AND inserteddatetime < CAST(:to AS date) + INTERVAL '1 day'
     AND reserve_flag='H' AND reserve_path IN ('ONLINE','APP','NAVER')
  UNION
  SELECT reserve_date, CAST(reserve_num AS VARCHAR)
    FROM raw.raw_crm_reservation
   WHERE reserve_date >= :from AND reserve_date <= :to
  UNION
  SELECT TO_CHAR(assign_date, 'YYYY-MM-DD'), CAST(dbcust_num AS VARCHAR)
    FROM raw.raw_crm_db_custom
   WHERE assign_date >= CAST(:from AS timestamp) AND assign_date < CAST(:to AS date) + INTERVAL '1 day'
     AND tm_emp IN ('KC0307','BV1119','BV1207','BV0067')
     AND COALESCE(gubun,'') NOT LIKE 'B2B%'
)
SELECT
  Z.reserve_date AS d,
  Z."totalCataract", 0 AS "totalPresbyopia", Z."inboundCall", Z."answeredCall",
  Z."newExamInquiry", Z."newReInquiry", Z."newPatient",
  Z."tmTotalDb", Z."tmValidDb", Z."tmReservation",
  Z."kakaoTotalInquiry", Z."kakaoCataractReservation", Z."kakaoPresbyopiaReservation",
  Z."onlineReservation", Z."onlineNoShow",
  Z."cancelOnline", Z."cancelCrm", Z."cancelKakao",
  Z.visit, Z."noShowReservation", Z.cancel
FROM (
  SELECT R.reserve_date AS reserve_date,
    MAX(CH_01.inbound_call)  AS "inboundCall",
    MAX(CH_01.answered_call) AS "answeredCall",
    SUM(CASE WHEN CH.gb IN ('백내장_신환','백내장_추가예약','카톡_검사예약','백내장_온라인예약','TM_예약') THEN 1 ELSE 0 END) AS "totalCataract",
    SUM(CASE WHEN CH.gb IN ('백내장_신규문의','백내장_신환') THEN 1 ELSE 0 END) AS "newExamInquiry",
    SUM(CASE WHEN CH.gb='백내장_재문의' THEN 1 ELSE 0 END)                    AS "newReInquiry",
    SUM(CASE WHEN CH.gb IN ('백내장_신환','백내장_추가예약') THEN 1 ELSE 0 END) AS "newPatient",
    SUM(CASE WHEN CH.gb IN ('TM_예약','TM_유효','TM_DB') THEN 1 ELSE 0 END)    AS "tmTotalDb",
    SUM(CASE WHEN CH.gb IN ('TM_예약','TM_유효') THEN 1 ELSE 0 END)             AS "tmValidDb",
    SUM(CASE WHEN CH.gb='TM_예약' THEN 1 ELSE 0 END)                            AS "tmReservation",
    SUM(CASE WHEN CH.gb IN ('카톡_검사예약','카톡_노안','카톡_취소','카톡_문의') THEN 1 ELSE 0 END) AS "kakaoTotalInquiry",
    SUM(CASE WHEN CH.gb='카톡_검사예약' THEN 1 ELSE 0 END)                      AS "kakaoCataractReservation",
    SUM(CASE WHEN CH.gb='카톡_노안'     THEN 1 ELSE 0 END)                      AS "kakaoPresbyopiaReservation",
    SUM(CASE WHEN CH.gb='백내장_온라인예약' THEN 1 ELSE 0 END)                  AS "onlineReservation",
    SUM(CASE WHEN CH.gb='백내장_부도' THEN 1 ELSE 0 END)                        AS "onlineNoShow",
    SUM(CASE WHEN CH.gb='백내장_취소' AND CH.gb2='ONLINE' THEN 1 ELSE 0 END)    AS "cancelOnline",
    SUM(CASE WHEN CH.gb='백내장_취소' AND CH.gb2='CRM' THEN 1 ELSE 0 END)       AS "cancelCrm",
    SUM(CASE WHEN CH.gb='카톡_취소' THEN 1 ELSE 0 END)                          AS "cancelKakao",
    SUM(CASE WHEN CH.gb='백내장_내원' THEN 1 ELSE 0 END)                        AS visit,
    SUM(CASE WHEN CH.gb='백내장_부도' THEN 1 ELSE 0 END)                        AS "noShowReservation",
    SUM(CASE WHEN CH.gb='백내장_취소' THEN 1 ELSE 0 END)                        AS cancel
  FROM R
  LEFT JOIN CH_ALL CH ON CH.pk = R.pk AND CH.reserve_date = R.reserve_date
  LEFT JOIN CH_01     ON CH_01.reserve_date = R.reserve_date
  GROUP BY R.reserve_date
) Z
ORDER BY Z.reserve_date
