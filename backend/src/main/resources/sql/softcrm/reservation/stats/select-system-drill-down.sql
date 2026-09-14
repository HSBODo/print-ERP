SET NOCOUNT ON;
IF OBJECT_ID('tempdb..#naver') IS NOT NULL DROP TABLE #naver;
SELECT CONVERT(VARCHAR(10), R.InsertedDateTime, 23) AS regDate,
       CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK, R.RESERVE_STATE AS state,
       ISNULL(R.CANCEL_REASON,'') AS cancelReason,
       ISNULL(CONVERT(VARCHAR(100), R.CUST_NUM),'') AS custNum,
       ISNULL(CONVERT(VARCHAR(100), R.RESERVE_NUM),'') AS reserveNum
  INTO #naver
  FROM RESERVATION R WITH(NOLOCK)
 WHERE R.RESERVE_PATH='NAVER' AND R.RESERVE_FLAG='M' AND R.RESERVE_JINRYO IN ('','5','6','7')
   AND R.InsertedDateTime >= :date AND R.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:date));
WITH
CH_01 AS (
  SELECT CONVERT(VARCHAR(10), stat_date, 23) AS 예약날짜, inbound AS 인입콜, answered AS 응대콜
  FROM OPENQUERY(EICN_MySQL,
    'SELECT stat_date, SUM(in_total) AS inbound, SUM(in_success) AS answered
       FROM stat_user_inbound_bseye
      WHERE stat_date = ''__OQ_DATE__''
        AND dcontext = ''hunt_context''
        AND hunt_number IN (''00000001121'',''07040180093'')
      GROUP BY stat_date')
),
CH_03 AS (
  SELECT DISTINCT
    CASE WHEN ((CtiGbnCod='A' and CtiCtgCod='M' and CtiDtlCod2='12')
            OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='18')
            OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='23')
            OR (CtiGbnCod='M' and CtiCtgCod='M' and CtiDtlCod2='4')) THEN '검사_예약'
         WHEN ((CtiGbnCod='A' and CtiCtgCod='M' and CtiDtlCod2='27')
            OR CtiRptMmo LIKE '%+1%' OR CtiRptMmo LIKE '%+2%' OR CtiRptMmo LIKE '%+3%' OR CtiRptMmo LIKE '%+4%' OR CtiRptMmo LIKE '%+5%') THEN '검사_추가예약'
         WHEN ((CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='17' AND (CtiDtlCod3 IS NULL OR CtiDtlCod3<>'29'))
            OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='18')
            OR (CtiGbnCod='A' and CtiCtgCod='M' and CtiDtlCod2='12')
            OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='23')
            OR (CtiGbnCod='M' and CtiCtgCod='M' and CtiDtlCod2='4')
            OR (CtiGbnCod='S' and CtiCtgCod='1' and CtiDtlCod2='29' AND (CtiDtlCod3 IS NULL OR CtiDtlCod3<>'29'))) THEN '검사_신규예약문의'
         ELSE '' END AS [GB],
    '' AS [GB2],
    CONVERT(VARCHAR(10), a.CtiRgtDtm, 23) AS [예약날짜],
    CONVERT(VARCHAR(100), a.CtiCallID) AS PK,
    '' AS custNum,
    '' AS reserveNum,
    '' AS reserveState,
    '' AS exclusionReasonCandidate
  FROM CtiRptLst a WITH(NOLOCK)
  LEFT JOIN CtiClg b WITH(NOLOCK) ON a.CtiCallID = b.ClgNum
  WHERE a.CtiRgtDtm >= :date AND a.CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND ISNULL(b.clgIOF,'I') = 'I'
),
CH_04 AS (
  SELECT DISTINCT
    CASE WHEN TM_Gubun IN('1000') THEN 'TM_예약'
         WHEN TM_Gubun IN('1000','2000') THEN 'TM_유효DB'
         ELSE 'TM' END AS [GB],
    '' AS [GB2],
    CONVERT(VARCHAR(10), assign_date, 23) AS [예약날짜],
    CONVERT(VARCHAR(100), a.DBCust_num) AS PK,
    CONVERT(VARCHAR(100), a.DBCust_num) AS custNum,
    '' AS reserveNum,
    '' AS reserveState,
    '' AS exclusionReasonCandidate
  FROM DB_CUSTOM a WITH(NOLOCK)
  WHERE a.assign_date >= :date AND a.assign_date < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND (TM_EMP IS NULL OR TM_EMP NOT IN('KC0307','BV1119','BV1207','BV0067'))
),
CH_05 AS (
  SELECT DISTINCT
    CASE WHEN ReCounsel_Memo LIKE '%예약' THEN 'TM_재상담예약'
         WHEN recounsel_state IN ('6') THEN 'TM_재상담유효'
         ELSE 'TM_재상담' END AS [GB],
    '' AS [GB2],
    CONVERT(VARCHAR(10), InsertedDateTime, 23) AS [예약날짜],
    CONVERT(VARCHAR(100), a.Pkey) AS PK,
    '' AS custNum,
    '' AS reserveNum,
    '' AS reserveState,
    '' AS exclusionReasonCandidate
  FROM DB_ReCounsel a WITH(NOLOCK)
  WHERE a.InsertedDateTime >= :date AND a.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND (NOT (ReCounsel_Memo LIKE '%테스트%' OR ReCounsel_Memo LIKE '%TEST%') OR ReCounsel_Memo IS NULL)
),
CH_06 AS (
  SELECT DISTINCT
    CASE WHEN RH.RESERVE_PATH IN ('ONLINE','APP') AND R.RESERVE_STATE <> 'C' THEN '홈페이지_예약'
         WHEN RH.RESERVE_PATH IN ('ONLINE','APP') THEN '홈페이지'
         ELSE '' END AS [GB],
    '' AS [GB2],
    -- 예약날짜 = 예약등록일(예약번호 RESERVE_NUM 앞 6자리 YYMMDD). daily-counts CH_06과 동일 기준.
    '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) AS [예약날짜],
    CONVERT(VARCHAR(100), RH.HISTORY_NUM) AS PK,
    ISNULL(CONVERT(VARCHAR(100), R.CUST_NUM),'') AS custNum,
    ISNULL(CONVERT(VARCHAR(100), R.RESERVE_NUM),'') AS reserveNum,
    ISNULL(R.RESERVE_STATE,'') AS reserveState,
    CASE
      WHEN ISNULL(R.CUST_NAME,'') LIKE '%테스트%' OR ISNULL(R.CUST_NAME,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%테스트%' OR ISNULL(R.COMMENT,'') LIKE '%TEST%' THEN '테스트'
      WHEN ISNULL(R.COMMENT,'') LIKE '%시뮬레이션%' OR ISNULL(C.ETC,'') LIKE '%시뮬레이션%' THEN '시뮬레이션'
      WHEN ISNULL(R.COMMENT,'') LIKE '%중복DB%' OR ISNULL(R.COMMENT,'') LIKE '%중복예약%' THEN '중복'
      WHEN ISNULL(R.COMMENT,'') LIKE '%차트있음%' OR ISNULL(C.ETC,'') LIKE '%차트있음%' THEN '차트있음'
      WHEN ISNULL(R.COMMENT,'') LIKE '%재검%' OR R.RESERVE_SEQ='5' THEN '재검'
      WHEN ISNULL(R.COMMENT,'') LIKE '%B2B(군인)%' OR R.RESERVE_SEQ='8' THEN 'B2B군인'
      WHEN ISNULL(C.ETC,'') LIKE '%홍보실 가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상데이터%' THEN '가상계정'
      ELSE ''
    END AS exclusionReasonCandidate
  FROM RESERVATION R WITH(NOLOCK)
  RIGHT JOIN CUSTOM C WITH(NOLOCK) ON C.CUST_NUM = R.CUST_NUM
  INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  -- HISTORY_TIME 쿠션(±1~2일)으로 인덱스 사용 후, 예약등록일(RESERVE_NUM YYMMDD)이 :date인 행만.
  WHERE RH.HISTORY_TIME >= DATEADD(DAY,-1,CONVERT(datetime,:date))
    AND RH.HISTORY_TIME < DATEADD(DAY,2,CONVERT(datetime,:date))
    AND '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) = CONVERT(VARCHAR(10),:date,23)
    AND R.RESERVE_FLAG = 'M'
    AND R.RESERVE_JINRYO IN ('','5','6','7')
    AND RH.MEMO = '예약저장'
    AND NOT (
         ISNULL(R.CUST_NAME,'') LIKE '%테스트%' OR ISNULL(R.CUST_NAME,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%시뮬레이션%' OR ISNULL(R.COMMENT,'') LIKE '%중복DB%'
      OR ISNULL(R.COMMENT,'') LIKE '%중복예약%' OR ISNULL(R.COMMENT,'') LIKE '%차트있음%' OR ISNULL(R.COMMENT,'') LIKE '%재검%'
      OR ISNULL(C.ETC,'') LIKE '%홍보실 가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상데이터%' OR ISNULL(C.ETC,'') LIKE '%시뮬레이션%'
      OR ISNULL(C.ETC,'') LIKE '%테스트%' OR ISNULL(C.ETC,'') LIKE '%TEST%' OR ISNULL(C.ETC,'') LIKE '%차트있음%' OR R.RESERVE_SEQ='8' OR R.RESERVE_SEQ='5'
      OR ISNULL(R.COMMENT,'') LIKE '%테스트%' OR ISNULL(R.COMMENT,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%B2B(군인)%'
      OR R.CUST_NUM='8888888888888' )
),
CH_07 AS (
  -- 취소(state='C')는 사유 무관 전부 사용자취소(레거시 RsvStt='C' 정합). exclusionReasonCandidate에 원사유 노출 유지.
  SELECT CASE WHEN state='C' THEN '네이버_사용자취소'
              ELSE '네이버_접수' END AS [GB],
         '' AS [GB2], regDate AS [예약날짜], PK,
         custNum,
         reserveNum,
         ISNULL(state,'') AS reserveState,
         CASE WHEN ISNULL(cancelReason,'') <> '' THEN cancelReason ELSE '' END AS exclusionReasonCandidate
  FROM #naver
),
CH_REJ AS (
  SELECT '네이버_거절' AS [GB], '' AS [GB2],
         CONVERT(VARCHAR(10), NrsRgtDtm, 23) AS [예약날짜],
         'NRJ' + CONVERT(VARCHAR(20), IDX) AS PK,
         '' AS custNum,
         ISNULL(RsvNum,'') AS reserveNum,
         ISNULL(RsvStt,'') AS reserveState,
         '네이버 거절' AS exclusionReasonCandidate
  FROM RESERVATION_NAVER WITH(NOLOCK)
  WHERE NrsRgtDtm >= :date AND NrsRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND RsvStt='C' AND ISNULL(RsvNum,'')=''
    AND NOT (CusNam LIKE '%테스트%' OR CusNam LIKE '%TEST%')
),
CH_08 AS (
  SELECT DISTINCT
    CASE WHEN C02.NAME = '★신환' THEN '카카오톡_예약'
         WHEN C02.NAME = '예약취소' THEN '카카오톡_취소'
         ELSE '카카오톡_문의' END AS [GB],
    '' AS [GB2],
    CONVERT(VARCHAR(10), InsertedDateTime, 23) AS [예약날짜],
    CONVERT(VARCHAR(23), InsertedDateTime, 21) AS PK,
    '' AS custNum,
    '' AS reserveNum,
    '' AS reserveState,
    '' AS exclusionReasonCandidate
  FROM HappyTalk_Counsel_List H WITH(NOLOCK)
  LEFT JOIN HappyTalk_Mapping M WITH(NOLOCK) ON H.HappyTalk_Num = M.HappyTalk_Num
  INNER JOIN HappyTalk_Category01 C01 WITH(NOLOCK) ON C01.Seq = H.Category01
  LEFT JOIN HappyTalk_Category02 C02 WITH(NOLOCK) ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
  WHERE InsertedDateTime >= :date AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND C01.Name = '수술전'
),
CH_09 AS (
  SELECT DISTINCT
    CASE WHEN R.RESERVE_STATE IN ('I','H') THEN '내원'
         WHEN R.RESERVE_STATE IN ('Y') AND R.RESERVE_DATE < CAST(GETDATE() AS DATE) THEN '예약부도'
         WHEN R.RESERVE_STATE IN ('C') THEN '취소' END AS [GB],
    CASE WHEN R.RESERVE_PATH IN ('ONLINE','APP') THEN '홈페이지' ELSE '' END AS [GB2],
    CONVERT(VARCHAR(10), R.RESERVE_DATE, 23) AS [예약날짜],
    CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK,
    ISNULL(CONVERT(VARCHAR(100), R.CUST_NUM),'') AS custNum,
    ISNULL(CONVERT(VARCHAR(100), R.RESERVE_NUM),'') AS reserveNum,
    ISNULL(R.RESERVE_STATE,'') AS reserveState,
    CASE
      WHEN ISNULL(R.CUST_NAME,'') LIKE '%테스트%' OR ISNULL(R.CUST_NAME,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%테스트%' OR ISNULL(R.COMMENT,'') LIKE '%TEST%' THEN '테스트'
      WHEN ISNULL(R.COMMENT,'') LIKE '%시뮬레이션%' OR ISNULL(C.ETC,'') LIKE '%시뮬레이션%' THEN '시뮬레이션'
      WHEN ISNULL(R.COMMENT,'') LIKE '%중복DB%' OR ISNULL(R.COMMENT,'') LIKE '%중복예약%' THEN '중복'
      WHEN ISNULL(R.COMMENT,'') LIKE '%차트있음%' OR ISNULL(C.ETC,'') LIKE '%차트있음%' THEN '차트있음'
      WHEN ISNULL(R.COMMENT,'') LIKE '%재검%' OR R.RESERVE_SEQ='5' THEN '재검'
      WHEN ISNULL(R.COMMENT,'') LIKE '%B2B(군인)%' OR R.RESERVE_SEQ='8' THEN 'B2B군인'
      WHEN ISNULL(C.ETC,'') LIKE '%홍보실 가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상데이터%' THEN '가상계정'
      ELSE ''
    END AS exclusionReasonCandidate
  FROM RESERVATION R WITH(NOLOCK)
  RIGHT JOIN CUSTOM C WITH(NOLOCK) ON C.CUST_NUM = R.CUST_NUM
  INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  WHERE R.RESERVE_DATE >= :date AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:date))
    AND R.RESERVE_FLAG = 'M'
    AND R.RESERVE_JINRYO IN ('','5','6','7')
    AND RH.MEMO = '예약저장'
    AND NOT (
         ISNULL(R.CUST_NAME,'') LIKE '%테스트%' OR ISNULL(R.CUST_NAME,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%시뮬레이션%' OR ISNULL(R.COMMENT,'') LIKE '%중복DB%'
      OR ISNULL(R.COMMENT,'') LIKE '%중복예약%' OR ISNULL(R.COMMENT,'') LIKE '%차트있음%' OR ISNULL(R.COMMENT,'') LIKE '%재검%'
      OR ISNULL(C.ETC,'') LIKE '%홍보실 가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상데이터%' OR ISNULL(C.ETC,'') LIKE '%시뮬레이션%'
      OR ISNULL(C.ETC,'') LIKE '%테스트%' OR ISNULL(C.ETC,'') LIKE '%TEST%' OR ISNULL(C.ETC,'') LIKE '%차트있음%' OR R.RESERVE_SEQ='8' OR R.RESERVE_SEQ='5'
      OR ISNULL(R.COMMENT,'') LIKE '%테스트%' OR ISNULL(R.COMMENT,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%B2B(군인)%'
      OR R.CUST_NUM='8888888888888' )
),
CH_ALL AS (
  SELECT 'CH_03' AS [source], GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_03
  UNION ALL SELECT 'CH_04', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_04
  UNION ALL SELECT 'CH_05', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_05
  UNION ALL SELECT 'CH_06', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_06
  UNION ALL SELECT 'CH_07', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_07
  UNION ALL SELECT 'CH_REJ', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_REJ
  UNION ALL SELECT 'CH_08', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_08
  UNION ALL SELECT 'CH_09', GB, GB2, PK, [예약날짜], custNum, reserveNum, reserveState, exclusionReasonCandidate FROM CH_09
),
DETAIL AS (
  SELECT
    CH.[예약날짜] AS d,
    FIELD_MAP.field,
    CH.[source],
    CH.GB AS gb,
    CH.GB2 AS gb2,
    CH.PK AS [primaryKey],
    CH.custNum,
    CH.reserveNum,
    CH.reserveState,
    CH.exclusionReasonCandidate,
    FIELD_MAP.contribution
  FROM CH_ALL CH
  -- FIELD_MAP: system-daily-counts.sql의 SUM(CASE...)와 같은 필드별 row 기여도 정의.
  CROSS APPLY (VALUES
    ('newInquiry', CASE WHEN CH.GB IN ('검사_신규예약문의','검사_예약') THEN 1 ELSE 0 END),
    ('callReservation', CASE WHEN CH.GB IN ('검사_예약','검사_추가예약') THEN 1 ELSE 0 END),
    ('tmTotalDb', CASE WHEN CH.GB IN ('TM_예약','TM_유효DB','TM') THEN 1 ELSE 0 END),
    ('tmValidDb', CASE WHEN CH.GB IN ('TM_유효DB','TM_예약') THEN 1 ELSE 0 END),
    ('tmReservation', CASE WHEN CH.GB='TM_예약' THEN 1 ELSE 0 END),
    ('tmRecounsel', CASE WHEN CH.GB IN ('TM_재상담','TM_재상담유효','TM_재상담예약') THEN 1 ELSE 0 END),
    ('tmRecounselValid', CASE WHEN CH.GB IN ('TM_재상담유효','TM_재상담예약') THEN 1 ELSE 0 END),
    ('tmRecounselReservation', CASE WHEN CH.GB='TM_재상담예약' THEN 1 ELSE 0 END),
    ('homeReceived', CASE WHEN CH.GB IN ('홈페이지_예약','홈페이지') THEN 1 ELSE 0 END),
    ('homeReservation', CASE WHEN CH.GB='홈페이지_예약' THEN 1 ELSE 0 END),
    ('naverReceived', CASE WHEN CH.GB IN ('네이버_접수','네이버_사용자취소','네이버_거절') THEN 1 ELSE 0 END),
    ('naverRejected', CASE WHEN CH.GB='네이버_거절' THEN 1 ELSE 0 END),
    ('naverValid', CASE WHEN CH.GB IN ('네이버_접수','네이버_사용자취소') THEN 1 ELSE 0 END),
    ('naverReservation', CASE WHEN CH.GB='네이버_접수' THEN 1 ELSE 0 END),
    ('kakaoInquiry', CASE WHEN CH.GB IN ('카카오톡_문의','카카오톡_예약','카카오톡_취소') THEN 1 ELSE 0 END),
    ('kakaoReservation', CASE WHEN CH.GB='카카오톡_예약' THEN 1 ELSE 0 END),
    ('cancelCallNaver', CASE WHEN CH.GB='취소' AND CH.GB2<>'홈페이지' THEN 1 ELSE 0 END),
    ('cancelHome', CASE WHEN CH.GB='취소' AND CH.GB2='홈페이지' THEN 1 ELSE 0 END),
    ('cancelKakao', CASE WHEN CH.GB='카카오톡_취소' THEN 1 ELSE 0 END),
    ('visit', CASE WHEN CH.GB='내원' THEN 1 ELSE 0 END),
    ('noShowReservation', CASE WHEN CH.GB='예약부도' THEN 1 ELSE 0 END),
    ('cancel', CASE WHEN CH.GB='취소' THEN 1 ELSE 0 END)
  ) FIELD_MAP(field, contribution)
  WHERE FIELD_MAP.field = :field AND FIELD_MAP.contribution <> 0

  UNION ALL

  SELECT
    C.예약날짜 AS d,
    FIELD_MAP.field,
    'CH_01' AS [source],
    FIELD_MAP.gb,
    '' AS gb2,
    'EICN_MySQL:' + C.예약날짜 + ':' + FIELD_MAP.field AS [primaryKey],
    '' AS custNum,
    '' AS reserveNum,
    '' AS reserveState,
    '' AS exclusionReasonCandidate,
    FIELD_MAP.contribution
  FROM CH_01 C
  -- FIELD_MAP: EICN_MySQL 집계값은 개별 row가 없으므로 일자/필드 단위 pseudo row로 노출한다.
  CROSS APPLY (VALUES
    ('inboundCall', '인입콜', ISNULL(C.인입콜,0)),
    ('answeredCall', '응대콜', ISNULL(C.응대콜,0))
  ) FIELD_MAP(field, gb, contribution)
  WHERE FIELD_MAP.field = :field AND FIELD_MAP.contribution <> 0
)
SELECT d, field, [source], gb, gb2, [primaryKey], custNum, reserveNum, reserveState, exclusionReasonCandidate, contribution
FROM DETAIL
ORDER BY d, [source], [primaryKey], field;
