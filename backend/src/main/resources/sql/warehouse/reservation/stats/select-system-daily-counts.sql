-- 예약통계_시력교정(시스템) 일자별 원시 카운트 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/reservation/stats/select-system-daily-counts.sql — 채널 정의·근거·검증은 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 MART_DIRECT (2026-10-06).
WITH
naver AS (
  SELECT TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD')      AS reg_date,
         CAST(r.reserve_num AS VARCHAR)                 AS pk,
         r.reserve_state                                AS state,
         COALESCE(r.cancel_reason, '')                  AS cancel_reason
    FROM raw.raw_crm_reservation r
   WHERE r.reserve_path='NAVER' AND r.reserve_flag='M' AND r.reserve_jinryo IN ('','5','6','7')
     AND r.inserteddatetime >= CAST(:from AS timestamp)
     AND r.inserteddatetime <  CAST(:to AS date) + INTERVAL '1 day'
),
CH_01 AS (
  -- EICN 링크드서버 대체 — raw.raw_eicn_stat_user_inbound_bseye 직접 조회. hunt_number 2개(시력교정 콜센터).
  SELECT TO_CHAR(stat_date, 'YYYY-MM-DD') AS reserve_date,
         SUM(in_total)   AS inbound_call,
         SUM(in_success) AS answered_call
    FROM raw.raw_eicn_stat_user_inbound_bseye
   WHERE stat_date BETWEEN CAST(:from AS date) AND CAST(:to AS date)
     AND dcontext = 'hunt_context'
     AND hunt_number IN ('00000001121','07040180093')
   GROUP BY stat_date
),
CH_03 AS (
  SELECT DISTINCT
    CASE WHEN ((ctigbncod='A' AND ctictgcod='M' AND ctidtlcod2='12')
            OR (ctigbncod='S' AND ctictgcod='1' AND ctidtlcod2='18')
            OR (ctigbncod='S' AND ctictgcod='1' AND ctidtlcod2='23')
            OR (ctigbncod='M' AND ctictgcod='M' AND ctidtlcod2='4')) THEN '검사_예약'
         WHEN ((ctigbncod='A' AND ctictgcod='M' AND ctidtlcod2='27')
            OR ctirptmmo LIKE '%+1%' OR ctirptmmo LIKE '%+2%' OR ctirptmmo LIKE '%+3%' OR ctirptmmo LIKE '%+4%' OR ctirptmmo LIKE '%+5%') THEN '검사_추가예약'
         WHEN ((ctigbncod='S' AND ctictgcod='1' AND ctidtlcod2='17' AND (ctidtlcod3 IS NULL OR ctidtlcod3<>'29'))
            OR (ctigbncod='S' AND ctictgcod='1' AND ctidtlcod2='18')
            OR (ctigbncod='A' AND ctictgcod='M' AND ctidtlcod2='12')
            OR (ctigbncod='S' AND ctictgcod='1' AND ctidtlcod2='23')
            OR (ctigbncod='M' AND ctictgcod='M' AND ctidtlcod2='4')
            OR (ctigbncod='S' AND ctictgcod='1' AND ctidtlcod2='29' AND (ctidtlcod3 IS NULL OR ctidtlcod3<>'29'))) THEN '검사_신규예약문의'
         ELSE '' END AS gb,
    '' AS gb2,
    TO_CHAR(a.ctirgtdtm, 'YYYY-MM-DD') AS reserve_date,
    a.cticallid                        AS pk
  FROM raw.raw_crm_ctirptlst a
  LEFT JOIN raw.raw_crm_cticlg b ON a.cticallid = b.clgnum
  WHERE a.ctirgtdtm >= CAST(:from AS timestamp)
    AND a.ctirgtdtm <  CAST(:to AS date) + INTERVAL '1 day'
    AND COALESCE(b.clgiof,'I') = 'I'
),
CH_04 AS (
  SELECT DISTINCT
    CASE WHEN tm_gubun IN ('1000') THEN 'TM_예약'
         WHEN tm_gubun IN ('1000','2000') THEN 'TM_유효DB'
         ELSE 'TM' END AS gb,
    '' AS gb2,
    TO_CHAR(assign_date, 'YYYY-MM-DD') AS reserve_date,
    CAST(dbcust_num AS VARCHAR)        AS pk
  FROM raw.raw_crm_db_custom
  WHERE assign_date >= CAST(:from AS timestamp)
    AND assign_date <  CAST(:to AS date) + INTERVAL '1 day'
    -- 백내장 TM팀 4명 제외(나머지=시력교정 TM). TM_EMP NULL은 4명이 아니므로 포함.
    AND (tm_emp IS NULL OR tm_emp NOT IN ('KC0307','BV1119','BV1207','BV0067'))
),
CH_05 AS (
  SELECT DISTINCT
    CASE WHEN recounsel_memo LIKE '%예약' THEN 'TM_재상담예약'
         WHEN recounsel_state IN ('6') THEN 'TM_재상담유효'
         ELSE 'TM_재상담' END AS gb,
    '' AS gb2,
    TO_CHAR(inserteddatetime, 'YYYY-MM-DD') AS reserve_date,
    CAST(pkey AS VARCHAR)                   AS pk
  FROM raw.raw_crm_db_recounsel
  WHERE inserteddatetime >= CAST(:from AS timestamp)
    AND inserteddatetime <  CAST(:to AS date) + INTERVAL '1 day'
    AND (NOT (recounsel_memo LIKE '%테스트%' OR recounsel_memo LIKE '%TEST%') OR recounsel_memo IS NULL)
),
CH_06 AS (
  SELECT DISTINCT
    CASE WHEN rh.reserve_path IN ('ONLINE','APP') AND r.reserve_state <> 'C' THEN '홈페이지_예약'
         WHEN rh.reserve_path IN ('ONLINE','APP') THEN '홈페이지'
         ELSE '' END AS gb,
    '' AS gb2,
    -- 예약날짜 = 예약등록일(RESERVE_NUM 앞 6자리 YYMMDD).
    '20' || SUBSTRING(r.reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 5 FOR 2) AS reserve_date,
    CAST(rh.history_num AS VARCHAR) AS pk
  FROM raw.raw_crm_reservation r
  RIGHT JOIN raw.raw_crm_custom c          ON c.cust_num = r.cust_num
  INNER JOIN raw.raw_crm_reserve_history rh ON r.reserve_num = rh.reserve_num
  -- HISTORY_TIME 쿠션(±1~2일)으로 인덱스 사용 후, 예약등록일로 정밀 필터.
  WHERE rh.history_time >= TO_CHAR(CAST(:from AS date) - INTERVAL '1 day', 'YYYY-MM-DD HH24:MI:SS')
    AND rh.history_time <  TO_CHAR(CAST(:to AS date) + INTERVAL '2 days', 'YYYY-MM-DD HH24:MI:SS')
    AND '20' || SUBSTRING(r.reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 5 FOR 2) >= :from
    AND '20' || SUBSTRING(r.reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 5 FOR 2) <= :to
    AND r.reserve_flag = 'M'
    AND r.reserve_jinryo IN ('','5','6','7')
    AND rh.memo = '예약저장'
    -- 제외 마커(테스트/재검/차트있음/가상계정/B2B군인/더미고객).
    AND NOT (
         COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' OR COALESCE(r.comment,'') LIKE '%시뮬레이션%' OR COALESCE(r.comment,'') LIKE '%중복DB%'
      OR COALESCE(r.comment,'') LIKE '%중복예약%' OR COALESCE(r.comment,'') LIKE '%차트있음%' OR COALESCE(r.comment,'') LIKE '%재검%'
      OR COALESCE(c.etc,'') LIKE '%홍보실 가상계정%' OR COALESCE(c.etc,'') LIKE '%가상계정%' OR COALESCE(c.etc,'') LIKE '%가상데이터%' OR COALESCE(c.etc,'') LIKE '%시뮬레이션%'
      OR COALESCE(c.etc,'') LIKE '%테스트%' OR COALESCE(c.etc,'') LIKE '%TEST%' OR COALESCE(c.etc,'') LIKE '%차트있음%' OR r.reserve_seq='8' OR r.reserve_seq='5'
      OR COALESCE(r.comment,'') LIKE '%테스트%' OR COALESCE(r.comment,'') LIKE '%TEST%' OR COALESCE(r.comment,'') LIKE '%B2B(군인)%'
      OR r.cust_num='8888888888888' )
),
-- 네이버 접수: RESERVATION(NAVER 경로) 등록일 카운트. 취소는 전부 사용자취소로 마킹.
CH_07 AS (
  SELECT CASE WHEN state='C' THEN '네이버_사용자취소'
              ELSE '네이버_접수' END AS gb,
         '' AS gb2, reg_date AS reserve_date, pk
    FROM naver
),
-- 네이버 파트너거절: 확정 전 거절(RESERVATION_NAVER, RsvNum 없는 취소). 유효접수 = 접수 − 거절.
CH_REJ AS (
  SELECT '네이버_거절' AS gb, '' AS gb2,
         TO_CHAR(nrsrgtdtm, 'YYYY-MM-DD') AS reserve_date,
         'NRJ' || CAST(idx AS VARCHAR)    AS pk
    FROM raw.raw_crm_reservation_naver
   WHERE nrsrgtdtm >= CAST(:from AS timestamp)
     AND nrsrgtdtm <  CAST(:to AS date) + INTERVAL '1 day'
     AND rsvstt='C' AND COALESCE(rsvnum,'')=''
     AND NOT (cusnam LIKE '%테스트%' OR cusnam LIKE '%TEST%')
),
CH_08 AS (
  SELECT DISTINCT
    CASE WHEN c02.name = '★신환' THEN '카카오톡_예약'
         WHEN c02.name = '예약취소' THEN '카카오톡_취소'
         ELSE '카카오톡_문의' END AS gb,
    '' AS gb2,
    TO_CHAR(h.inserteddatetime, 'YYYY-MM-DD')              AS reserve_date,
    TO_CHAR(h.inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS') AS pk
  FROM raw.raw_crm_happytalk_counsel_list h
  LEFT JOIN raw.raw_crm_happytalk_mapping m ON h.happytalk_num = m.happytalk_num
  INNER JOIN raw.raw_crm_happytalk_category01 c01 ON c01.seq = h.category01
  LEFT JOIN raw.raw_crm_happytalk_category02 c02 ON c02.pkey = h.category02 AND c02.fkey = h.category01
  WHERE h.inserteddatetime >= CAST(:from AS timestamp)
    AND h.inserteddatetime <  CAST(:to AS date) + INTERVAL '1 day'
    AND c01.name = '수술전'
),
CH_09 AS (
  SELECT DISTINCT
    CASE WHEN r.reserve_state IN ('I','H') THEN '내원'
         WHEN r.reserve_state IN ('Y') AND r.reserve_date < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') THEN '예약부도'
         WHEN r.reserve_state IN ('C') THEN '취소' END AS gb,
    CASE WHEN r.reserve_path IN ('ONLINE','APP') THEN '홈페이지' ELSE '' END AS gb2,
    r.reserve_date                  AS reserve_date,
    CAST(r.reserve_num AS VARCHAR) AS pk
  FROM raw.raw_crm_reservation r
  RIGHT JOIN raw.raw_crm_custom c          ON c.cust_num = r.cust_num
  INNER JOIN raw.raw_crm_reserve_history rh ON r.reserve_num = rh.reserve_num
  WHERE r.reserve_date >= :from
    AND r.reserve_date <= :to
    AND r.reserve_flag = 'M'
    AND r.reserve_jinryo IN ('','5','6','7')
    AND rh.memo = '예약저장'
    AND NOT (
         COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' OR COALESCE(r.comment,'') LIKE '%시뮬레이션%' OR COALESCE(r.comment,'') LIKE '%중복DB%'
      OR COALESCE(r.comment,'') LIKE '%중복예약%' OR COALESCE(r.comment,'') LIKE '%차트있음%' OR COALESCE(r.comment,'') LIKE '%재검%'
      OR COALESCE(c.etc,'') LIKE '%홍보실 가상계정%' OR COALESCE(c.etc,'') LIKE '%가상계정%' OR COALESCE(c.etc,'') LIKE '%가상데이터%' OR COALESCE(c.etc,'') LIKE '%시뮬레이션%'
      OR COALESCE(c.etc,'') LIKE '%테스트%' OR COALESCE(c.etc,'') LIKE '%TEST%' OR COALESCE(c.etc,'') LIKE '%차트있음%' OR r.reserve_seq='8' OR r.reserve_seq='5'
      OR COALESCE(r.comment,'') LIKE '%테스트%' OR COALESCE(r.comment,'') LIKE '%TEST%' OR COALESCE(r.comment,'') LIKE '%B2B(군인)%'
      OR r.cust_num='8888888888888' )
),
CH_ALL AS (
  SELECT gb, gb2, pk, reserve_date FROM CH_03
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_04
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_05
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_06
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_07
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_REJ
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_08
  UNION ALL SELECT gb, gb2, pk, reserve_date FROM CH_09
),
R AS (
  SELECT TO_CHAR(ctirgtdtm, 'YYYY-MM-DD') AS reserve_date, CAST(cticallid AS VARCHAR) AS pk
    FROM raw.raw_crm_ctirptlst
   WHERE ctirgtdtm >= CAST(:from AS timestamp) AND ctirgtdtm < CAST(:to AS date) + INTERVAL '1 day'
  UNION SELECT TO_CHAR(assign_date, 'YYYY-MM-DD'), CAST(dbcust_num AS VARCHAR)
    FROM raw.raw_crm_db_custom
   WHERE assign_date >= CAST(:from AS timestamp) AND assign_date < CAST(:to AS date) + INTERVAL '1 day'
  UNION SELECT TO_CHAR(inserteddatetime, 'YYYY-MM-DD'), CAST(pkey AS VARCHAR)
    FROM raw.raw_crm_db_recounsel
   WHERE inserteddatetime >= CAST(:from AS timestamp) AND inserteddatetime < CAST(:to AS date) + INTERVAL '1 day'
  -- 홈페이지(CH_06)와 동일하게 예약등록일(RESERVE_NUM YYMMDD) 기준으로 PK·날짜를 맞춰야 조인됨.
  UNION SELECT '20' || SUBSTRING(reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(reserve_num FROM 5 FOR 2),
               CAST(history_num AS VARCHAR)
    FROM raw.raw_crm_reserve_history
   WHERE history_time >= TO_CHAR(CAST(:from AS date) - INTERVAL '1 day', 'YYYY-MM-DD HH24:MI:SS')
     AND history_time <  TO_CHAR(CAST(:to AS date) + INTERVAL '2 days', 'YYYY-MM-DD HH24:MI:SS')
     AND '20' || SUBSTRING(reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(reserve_num FROM 5 FOR 2) >= :from
     AND '20' || SUBSTRING(reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(reserve_num FROM 5 FOR 2) <= :to
  UNION SELECT reserve_date, CAST(reserve_num AS VARCHAR)
    FROM raw.raw_crm_reservation
   WHERE reserve_date >= :from AND reserve_date <= :to
  UNION SELECT TO_CHAR(inserteddatetime, 'YYYY-MM-DD'), TO_CHAR(inserteddatetime, 'YYYY-MM-DD HH24:MI:SS.MS')
    FROM raw.raw_crm_happytalk_counsel_list
   WHERE inserteddatetime >= CAST(:from AS timestamp) AND inserteddatetime < CAST(:to AS date) + INTERVAL '1 day'
  UNION SELECT reg_date, pk FROM naver
  UNION SELECT TO_CHAR(nrsrgtdtm, 'YYYY-MM-DD'), 'NRJ' || CAST(idx AS VARCHAR)
    FROM raw.raw_crm_reservation_naver
   WHERE nrsrgtdtm >= CAST(:from AS timestamp) AND nrsrgtdtm < CAST(:to AS date) + INTERVAL '1 day'
     AND rsvstt='C' AND COALESCE(rsvnum,'')=''
     AND NOT (cusnam LIKE '%테스트%' OR cusnam LIKE '%TEST%')
)
SELECT
  Z.reserve_date AS d,
  Z."inboundCall", Z."answeredCall", Z."newInquiry", Z."callReservation",
  Z."tmTotalDb", Z."tmValidDb", Z."tmReservation", Z."tmRecounsel",
  Z."tmRecounselValid", Z."tmRecounselReservation",
  Z."homeReceived", Z."homeReservation",
  Z."naverReceived", Z."naverRejected", Z."naverValid", Z."naverReservation",
  Z."kakaoInquiry", Z."kakaoReservation",
  Z."cancelCallNaver", Z."cancelHome", Z."cancelKakao",
  Z.visit, Z."noShowReservation", Z.cancel
FROM (
  SELECT
    R.reserve_date AS reserve_date,
    MAX(CH_01.inbound_call)  AS "inboundCall",
    MAX(CH_01.answered_call) AS "answeredCall",
    SUM(CASE WHEN CH.gb='검사_신규예약문의' OR CH.gb='검사_예약' THEN 1 ELSE 0 END) AS "newInquiry",
    SUM(CASE WHEN CH.gb='검사_예약' OR CH.gb='검사_추가예약' THEN 1 ELSE 0 END) AS "callReservation",
    SUM(CASE WHEN CH.gb='TM_예약' OR CH.gb='TM_유효DB' OR CH.gb='TM' THEN 1 ELSE 0 END) AS "tmTotalDb",
    SUM(CASE WHEN CH.gb='TM_유효DB' OR CH.gb='TM_예약' THEN 1 ELSE 0 END) AS "tmValidDb",
    SUM(CASE WHEN CH.gb='TM_예약' THEN 1 ELSE 0 END) AS "tmReservation",
    SUM(CASE WHEN CH.gb='TM_재상담' OR CH.gb='TM_재상담유효' OR CH.gb='TM_재상담예약' THEN 1 ELSE 0 END) AS "tmRecounsel",
    SUM(CASE WHEN CH.gb='TM_재상담유효' OR CH.gb='TM_재상담예약' THEN 1 ELSE 0 END) AS "tmRecounselValid",
    SUM(CASE WHEN CH.gb='TM_재상담예약' THEN 1 ELSE 0 END) AS "tmRecounselReservation",
    SUM(CASE WHEN CH.gb='홈페이지_예약' OR CH.gb='홈페이지' THEN 1 ELSE 0 END) AS "homeReceived",
    SUM(CASE WHEN CH.gb='홈페이지_예약' THEN 1 ELSE 0 END) AS "homeReservation",
    -- 네이버 정합: 접수=원천(RESERVATION네이버 + 파트너거절), 유효=접수−거절, 예약=유효−사용자취소.
    SUM(CASE WHEN CH.gb IN ('네이버_접수','네이버_사용자취소','네이버_거절') THEN 1 ELSE 0 END) AS "naverReceived",
    SUM(CASE WHEN CH.gb='네이버_거절' THEN 1 ELSE 0 END) AS "naverRejected",
    SUM(CASE WHEN CH.gb IN ('네이버_접수','네이버_사용자취소') THEN 1 ELSE 0 END) AS "naverValid",
    SUM(CASE WHEN CH.gb='네이버_접수' THEN 1 ELSE 0 END) AS "naverReservation",
    SUM(CASE WHEN CH.gb='카카오톡_문의' OR CH.gb='카카오톡_예약' OR CH.gb='카카오톡_취소' THEN 1 ELSE 0 END) AS "kakaoInquiry",
    SUM(CASE WHEN CH.gb='카카오톡_예약' THEN 1 ELSE 0 END) AS "kakaoReservation",
    SUM(CASE WHEN CH.gb='취소' AND CH.gb2<>'홈페이지' THEN 1 ELSE 0 END) AS "cancelCallNaver",
    SUM(CASE WHEN CH.gb='취소' AND CH.gb2='홈페이지' THEN 1 ELSE 0 END) AS "cancelHome",
    SUM(CASE WHEN CH.gb='카카오톡_취소' THEN 1 ELSE 0 END) AS "cancelKakao",
    SUM(CASE WHEN CH.gb='내원' THEN 1 ELSE 0 END) AS visit,
    SUM(CASE WHEN CH.gb='예약부도' THEN 1 ELSE 0 END) AS "noShowReservation",
    SUM(CASE WHEN CH.gb='취소' THEN 1 ELSE 0 END) AS cancel
  FROM R
  LEFT JOIN CH_ALL CH ON CH.pk = R.pk AND CH.reserve_date = R.reserve_date
  LEFT JOIN CH_01     ON CH_01.reserve_date = R.reserve_date
  GROUP BY R.reserve_date
) Z
ORDER BY Z.reserve_date
