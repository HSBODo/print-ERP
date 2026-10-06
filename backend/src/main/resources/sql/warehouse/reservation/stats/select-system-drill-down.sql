-- 예약통계_시력교정(시스템) 드릴다운 (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/softcrm/reservation/stats/select-system-drill-down.sql — 채널 정의는 그쪽 헤더 참고.
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · Phase 2 MART_DIRECT (2026-10-06).
WITH
naver AS (
  SELECT TO_CHAR(r.inserteddatetime, 'YYYY-MM-DD')      AS reg_date,
         CAST(r.reserve_num AS VARCHAR)                 AS pk,
         r.reserve_state                                AS state,
         COALESCE(r.cancel_reason, '')                  AS cancel_reason,
         COALESCE(CAST(r.cust_num AS VARCHAR), '')      AS cust_num,
         COALESCE(CAST(r.reserve_num AS VARCHAR), '')   AS reserve_num
    FROM raw.raw_crm_reservation r
   WHERE r.reserve_path='NAVER' AND r.reserve_flag='M' AND r.reserve_jinryo IN ('','5','6','7')
     AND r.inserteddatetime >= CAST(:date AS timestamp)
     AND r.inserteddatetime <  CAST(:date AS date) + INTERVAL '1 day'
),
CH_01 AS (
  -- EICN 링크드서버 대체 — raw.raw_eicn_stat_user_inbound_bseye 직접 조회.
  SELECT TO_CHAR(stat_date, 'YYYY-MM-DD') AS reserve_date,
         SUM(in_total)   AS inbound_call,
         SUM(in_success) AS answered_call
    FROM raw.raw_eicn_stat_user_inbound_bseye
   WHERE stat_date = CAST(:date AS date)
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
    CAST(a.cticallid AS VARCHAR)       AS pk,
    '' AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    '' AS "exclusionReasonCandidate"
  FROM raw.raw_crm_ctirptlst a
  LEFT JOIN raw.raw_crm_cticlg b ON a.cticallid = b.clgnum
  WHERE a.ctirgtdtm >= CAST(:date AS timestamp)
    AND a.ctirgtdtm <  CAST(:date AS date) + INTERVAL '1 day'
    AND COALESCE(b.clgiof,'I') = 'I'
),
CH_04 AS (
  SELECT DISTINCT
    CASE WHEN tm_gubun IN ('1000') THEN 'TM_예약'
         WHEN tm_gubun IN ('1000','2000') THEN 'TM_유효DB'
         ELSE 'TM' END AS gb,
    '' AS gb2,
    TO_CHAR(assign_date, 'YYYY-MM-DD') AS reserve_date,
    CAST(dbcust_num AS VARCHAR)        AS pk,
    CAST(dbcust_num AS VARCHAR)        AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    '' AS "exclusionReasonCandidate"
  FROM raw.raw_crm_db_custom
  WHERE assign_date >= CAST(:date AS timestamp)
    AND assign_date <  CAST(:date AS date) + INTERVAL '1 day'
    AND (tm_emp IS NULL OR tm_emp NOT IN ('KC0307','BV1119','BV1207','BV0067'))
),
CH_05 AS (
  SELECT DISTINCT
    CASE WHEN recounsel_memo LIKE '%예약' THEN 'TM_재상담예약'
         WHEN recounsel_state IN ('6') THEN 'TM_재상담유효'
         ELSE 'TM_재상담' END AS gb,
    '' AS gb2,
    TO_CHAR(inserteddatetime, 'YYYY-MM-DD') AS reserve_date,
    CAST(pkey AS VARCHAR)                   AS pk,
    '' AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    '' AS "exclusionReasonCandidate"
  FROM raw.raw_crm_db_recounsel
  WHERE inserteddatetime >= CAST(:date AS timestamp)
    AND inserteddatetime <  CAST(:date AS date) + INTERVAL '1 day'
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
    CAST(rh.history_num AS VARCHAR) AS pk,
    COALESCE(CAST(r.cust_num AS VARCHAR), '')     AS "custNum",
    COALESCE(CAST(r.reserve_num AS VARCHAR), '')  AS "reserveNum",
    COALESCE(r.reserve_state, '')                 AS "reserveState",
    CASE
      WHEN COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' OR COALESCE(r.comment,'') LIKE '%테스트%' OR COALESCE(r.comment,'') LIKE '%TEST%' THEN '테스트'
      WHEN COALESCE(r.comment,'') LIKE '%시뮬레이션%' OR COALESCE(c.etc,'') LIKE '%시뮬레이션%' THEN '시뮬레이션'
      WHEN COALESCE(r.comment,'') LIKE '%중복DB%' OR COALESCE(r.comment,'') LIKE '%중복예약%' THEN '중복'
      WHEN COALESCE(r.comment,'') LIKE '%차트있음%' OR COALESCE(c.etc,'') LIKE '%차트있음%' THEN '차트있음'
      WHEN COALESCE(r.comment,'') LIKE '%재검%' OR r.reserve_seq='5' THEN '재검'
      WHEN COALESCE(r.comment,'') LIKE '%B2B(군인)%' OR r.reserve_seq='8' THEN 'B2B군인'
      WHEN COALESCE(c.etc,'') LIKE '%홍보실 가상계정%' OR COALESCE(c.etc,'') LIKE '%가상계정%' OR COALESCE(c.etc,'') LIKE '%가상데이터%' THEN '가상계정'
      ELSE ''
    END AS "exclusionReasonCandidate"
  FROM raw.raw_crm_reservation r
  RIGHT JOIN raw.raw_crm_custom c          ON c.cust_num = r.cust_num
  INNER JOIN raw.raw_crm_reserve_history rh ON r.reserve_num = rh.reserve_num
  WHERE rh.history_time >= TO_CHAR(CAST(:date AS date) - INTERVAL '1 day', 'YYYY-MM-DD HH24:MI:SS')
    AND rh.history_time <  TO_CHAR(CAST(:date AS date) + INTERVAL '2 days', 'YYYY-MM-DD HH24:MI:SS')
    AND '20' || SUBSTRING(r.reserve_num FROM 1 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 3 FOR 2) || '-' || SUBSTRING(r.reserve_num FROM 5 FOR 2) = :date
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
CH_07 AS (
  -- 취소(state='C')는 사유 무관 전부 사용자취소. exclusionReasonCandidate 에 원사유 노출 유지.
  SELECT CASE WHEN state='C' THEN '네이버_사용자취소'
              ELSE '네이버_접수' END AS gb,
         '' AS gb2, reg_date AS reserve_date, pk,
         cust_num                              AS "custNum",
         reserve_num                           AS "reserveNum",
         COALESCE(state, '')                   AS "reserveState",
         CASE WHEN COALESCE(cancel_reason,'') <> '' THEN cancel_reason ELSE '' END AS "exclusionReasonCandidate"
    FROM naver
),
CH_REJ AS (
  SELECT '네이버_거절' AS gb, '' AS gb2,
         TO_CHAR(nrsrgtdtm, 'YYYY-MM-DD') AS reserve_date,
         'NRJ' || CAST(idx AS VARCHAR)    AS pk,
         '' AS "custNum",
         COALESCE(rsvnum,'') AS "reserveNum",
         COALESCE(rsvstt,'') AS "reserveState",
         '네이버 거절' AS "exclusionReasonCandidate"
    FROM raw.raw_crm_reservation_naver
   WHERE nrsrgtdtm >= CAST(:date AS timestamp)
     AND nrsrgtdtm <  CAST(:date AS date) + INTERVAL '1 day'
     AND rsvstt='C' AND COALESCE(rsvnum,'')=''
     AND NOT (cusnam LIKE '%테스트%' OR cusnam LIKE '%TEST%')
),
CH_08 AS (
  SELECT DISTINCT
    CASE WHEN c02.name = '★신환' THEN '카카오톡_예약'
         WHEN c02.name = '예약취소' THEN '카카오톡_취소'
         ELSE '카카오톡_문의' END AS gb,
    '' AS gb2,
    TO_CHAR(h.inserteddatetime, 'YYYY-MM-DD')               AS reserve_date,
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
    AND c01.name = '수술전'
),
CH_09 AS (
  SELECT DISTINCT
    CASE WHEN r.reserve_state IN ('I','H') THEN '내원'
         WHEN r.reserve_state IN ('Y') AND r.reserve_date < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') THEN '예약부도'
         WHEN r.reserve_state IN ('C') THEN '취소' END AS gb,
    CASE WHEN r.reserve_path IN ('ONLINE','APP') THEN '홈페이지' ELSE '' END AS gb2,
    r.reserve_date                 AS reserve_date,
    CAST(r.reserve_num AS VARCHAR) AS pk,
    COALESCE(CAST(r.cust_num AS VARCHAR), '')     AS "custNum",
    COALESCE(CAST(r.reserve_num AS VARCHAR), '')  AS "reserveNum",
    COALESCE(r.reserve_state, '')                 AS "reserveState",
    CASE
      WHEN COALESCE(r.cust_name,'') LIKE '%테스트%' OR COALESCE(r.cust_name,'') LIKE '%TEST%' OR COALESCE(r.comment,'') LIKE '%테스트%' OR COALESCE(r.comment,'') LIKE '%TEST%' THEN '테스트'
      WHEN COALESCE(r.comment,'') LIKE '%시뮬레이션%' OR COALESCE(c.etc,'') LIKE '%시뮬레이션%' THEN '시뮬레이션'
      WHEN COALESCE(r.comment,'') LIKE '%중복DB%' OR COALESCE(r.comment,'') LIKE '%중복예약%' THEN '중복'
      WHEN COALESCE(r.comment,'') LIKE '%차트있음%' OR COALESCE(c.etc,'') LIKE '%차트있음%' THEN '차트있음'
      WHEN COALESCE(r.comment,'') LIKE '%재검%' OR r.reserve_seq='5' THEN '재검'
      WHEN COALESCE(r.comment,'') LIKE '%B2B(군인)%' OR r.reserve_seq='8' THEN 'B2B군인'
      WHEN COALESCE(c.etc,'') LIKE '%홍보실 가상계정%' OR COALESCE(c.etc,'') LIKE '%가상계정%' OR COALESCE(c.etc,'') LIKE '%가상데이터%' THEN '가상계정'
      ELSE ''
    END AS "exclusionReasonCandidate"
  FROM raw.raw_crm_reservation r
  RIGHT JOIN raw.raw_crm_custom c          ON c.cust_num = r.cust_num
  INNER JOIN raw.raw_crm_reserve_history rh ON r.reserve_num = rh.reserve_num
  WHERE r.reserve_date = :date
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
  SELECT 'CH_03' AS source, gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_03
  UNION ALL SELECT 'CH_04',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_04
  UNION ALL SELECT 'CH_05',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_05
  UNION ALL SELECT 'CH_06',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_06
  UNION ALL SELECT 'CH_07',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_07
  UNION ALL SELECT 'CH_REJ', gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_REJ
  UNION ALL SELECT 'CH_08',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_08
  UNION ALL SELECT 'CH_09',  gb, gb2, pk, reserve_date, "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate" FROM CH_09
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
  -- FIELD_MAP: system-daily-counts.sql 의 SUM(CASE...) 와 같은 필드별 row 기여도 정의.
  CROSS JOIN LATERAL (VALUES
    ('newInquiry',             CASE WHEN CH.gb IN ('검사_신규예약문의','검사_예약') THEN 1 ELSE 0 END),
    ('callReservation',        CASE WHEN CH.gb IN ('검사_예약','검사_추가예약') THEN 1 ELSE 0 END),
    ('tmTotalDb',              CASE WHEN CH.gb IN ('TM_예약','TM_유효DB','TM') THEN 1 ELSE 0 END),
    ('tmValidDb',              CASE WHEN CH.gb IN ('TM_유효DB','TM_예약') THEN 1 ELSE 0 END),
    ('tmReservation',          CASE WHEN CH.gb='TM_예약' THEN 1 ELSE 0 END),
    ('tmRecounsel',            CASE WHEN CH.gb IN ('TM_재상담','TM_재상담유효','TM_재상담예약') THEN 1 ELSE 0 END),
    ('tmRecounselValid',       CASE WHEN CH.gb IN ('TM_재상담유효','TM_재상담예약') THEN 1 ELSE 0 END),
    ('tmRecounselReservation', CASE WHEN CH.gb='TM_재상담예약' THEN 1 ELSE 0 END),
    ('homeReceived',           CASE WHEN CH.gb IN ('홈페이지_예약','홈페이지') THEN 1 ELSE 0 END),
    ('homeReservation',        CASE WHEN CH.gb='홈페이지_예약' THEN 1 ELSE 0 END),
    ('naverReceived',          CASE WHEN CH.gb IN ('네이버_접수','네이버_사용자취소','네이버_거절') THEN 1 ELSE 0 END),
    ('naverRejected',          CASE WHEN CH.gb='네이버_거절' THEN 1 ELSE 0 END),
    ('naverValid',             CASE WHEN CH.gb IN ('네이버_접수','네이버_사용자취소') THEN 1 ELSE 0 END),
    ('naverReservation',       CASE WHEN CH.gb='네이버_접수' THEN 1 ELSE 0 END),
    ('kakaoInquiry',           CASE WHEN CH.gb IN ('카카오톡_문의','카카오톡_예약','카카오톡_취소') THEN 1 ELSE 0 END),
    ('kakaoReservation',       CASE WHEN CH.gb='카카오톡_예약' THEN 1 ELSE 0 END),
    ('cancelCallNaver',        CASE WHEN CH.gb='취소' AND CH.gb2<>'홈페이지' THEN 1 ELSE 0 END),
    ('cancelHome',             CASE WHEN CH.gb='취소' AND CH.gb2='홈페이지' THEN 1 ELSE 0 END),
    ('cancelKakao',            CASE WHEN CH.gb='카카오톡_취소' THEN 1 ELSE 0 END),
    ('visit',                  CASE WHEN CH.gb='내원' THEN 1 ELSE 0 END),
    ('noShowReservation',      CASE WHEN CH.gb='예약부도' THEN 1 ELSE 0 END),
    ('cancel',                 CASE WHEN CH.gb='취소' THEN 1 ELSE 0 END)
  ) AS FIELD_MAP(field, contribution)
  WHERE FIELD_MAP.field = :field AND FIELD_MAP.contribution <> 0

  UNION ALL

  SELECT
    C.reserve_date AS d,
    FIELD_MAP.field,
    'CH_01' AS source,
    FIELD_MAP.gb,
    '' AS gb2,
    'EICN_MySQL:' || C.reserve_date || ':' || FIELD_MAP.field AS "primaryKey",
    '' AS "custNum",
    '' AS "reserveNum",
    '' AS "reserveState",
    '' AS "exclusionReasonCandidate",
    FIELD_MAP.contribution
  FROM CH_01 C
  -- FIELD_MAP: EICN 집계값은 개별 row 가 없으므로 일자/필드 단위 pseudo row 로 노출.
  CROSS JOIN LATERAL (VALUES
    ('inboundCall',  '인입콜',  COALESCE(C.inbound_call, 0)),
    ('answeredCall', '응대콜', COALESCE(C.answered_call, 0))
  ) AS FIELD_MAP(field, gb, contribution)
  WHERE FIELD_MAP.field = :field AND FIELD_MAP.contribution <> 0
)
SELECT d, field, source, gb, gb2, "primaryKey", "custNum", "reserveNum", "reserveState", "exclusionReasonCandidate", contribution
FROM DETAIL
ORDER BY d, source, "primaryKey", field
