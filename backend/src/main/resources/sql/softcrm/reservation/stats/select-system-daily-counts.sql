SET NOCOUNT ON;
IF OBJECT_ID('tempdb..#naver') IS NOT NULL DROP TABLE #naver;
SELECT CONVERT(VARCHAR(10), R.InsertedDateTime, 23) AS regDate,
       CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK, R.RESERVE_STATE AS state,
       ISNULL(R.CANCEL_REASON,'') AS cancelReason
  INTO #naver
  FROM RESERVATION R WITH(NOLOCK)
 WHERE R.RESERVE_PATH='NAVER' AND R.RESERVE_FLAG='M' AND R.RESERVE_JINRYO IN ('','5','6','7')
   AND R.InsertedDateTime >= :from AND R.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to));
WITH
CH_01 AS (
  SELECT CONVERT(VARCHAR(10), stat_date, 23) AS 예약날짜, inbound AS 인입콜, answered AS 응대콜
  FROM OPENQUERY(EICN_MySQL,
    'SELECT stat_date, SUM(in_total) AS inbound, SUM(in_success) AS answered
       FROM stat_user_inbound_bseye
      WHERE stat_date BETWEEN ''__OQ_FROM__'' AND ''__OQ_TO__''
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
    a.CtiCallID AS PK
  FROM CtiRptLst a WITH(NOLOCK)
  LEFT JOIN CtiClg b WITH(NOLOCK) ON a.CtiCallID = b.ClgNum
  WHERE a.CtiRgtDtm >= :from AND a.CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND ISNULL(b.clgIOF,'I') = 'I'
),
CH_04 AS (
  SELECT DISTINCT
    CASE WHEN TM_Gubun IN('1000') THEN 'TM_예약'
         WHEN TM_Gubun IN('1000','2000') THEN 'TM_유효DB'
         ELSE 'TM' END AS [GB],
    '' AS [GB2],
    CONVERT(VARCHAR(10), assign_date, 23) AS [예약날짜],
    a.DBCust_num AS PK
  FROM DB_CUSTOM a WITH(NOLOCK)
  WHERE a.assign_date >= :from AND a.assign_date < DATEADD(DAY,1,CONVERT(datetime,:to))
    -- 백내장 TM팀 4명 제외(나머지=시력교정 TM). TM_EMP NULL은 4명이 아니므로 포함(NULL NOT IN → unknown 누락 방지).
    AND (TM_EMP IS NULL OR TM_EMP NOT IN('KC0307','BV1119','BV1207','BV0067'))
),
CH_05 AS (
  SELECT DISTINCT
    CASE WHEN ReCounsel_Memo LIKE '%예약' THEN 'TM_재상담예약'
         WHEN recounsel_state IN ('6') THEN 'TM_재상담유효'
         ELSE 'TM_재상담' END AS [GB],
    '' AS [GB2],
    CONVERT(VARCHAR(10), InsertedDateTime, 23) AS [예약날짜],
    CONVERT(VARCHAR(100), a.Pkey) AS PK
  FROM DB_ReCounsel a WITH(NOLOCK)
  WHERE a.InsertedDateTime >= :from AND a.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND (NOT (ReCounsel_Memo LIKE '%테스트%' OR ReCounsel_Memo LIKE '%TEST%') OR ReCounsel_Memo IS NULL)
),
CH_06 AS (
  SELECT DISTINCT
    CASE WHEN RH.RESERVE_PATH IN ('ONLINE','APP') AND R.RESERVE_STATE <> 'C' THEN '홈페이지_예약'
         WHEN RH.RESERVE_PATH IN ('ONLINE','APP') THEN '홈페이지'
         ELSE '' END AS [GB],
    '' AS [GB2],
    -- 예약날짜 = 예약등록일(예약번호 RESERVE_NUM 앞 6자리 YYMMDD). 레거시/골든와이즈 명단과 정합.
    -- (구: HISTORY_TIME='예약저장' 시각. 심야 온라인예약이 새벽 배치로 +9h 밀려 다음날로 잡히던 문제.)
    '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) AS [예약날짜],
    CONVERT(VARCHAR(100), RH.HISTORY_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK)
  RIGHT JOIN CUSTOM C WITH(NOLOCK) ON C.CUST_NUM = R.CUST_NUM
  INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  -- HISTORY_TIME 쿠션(±1~2일)으로 인덱스 사용 후, 예약등록일로 정밀 필터(등록일 ≤ 저장시각 ≤ 등록일+~1일).
  WHERE RH.HISTORY_TIME >= DATEADD(DAY,-1,CONVERT(datetime,:from))
    AND RH.HISTORY_TIME < DATEADD(DAY,2,CONVERT(datetime,:to))
    -- 문자열 비교('YYYY-MM-DD'는 사전순=날짜순). TRY_CONVERT 미지원 서버 대응 + 변환오류 회피.
    AND '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) >= CONVERT(VARCHAR(10),:from,23)
    AND '20'+SUBSTRING(R.RESERVE_NUM,1,2)+'-'+SUBSTRING(R.RESERVE_NUM,3,2)+'-'+SUBSTRING(R.RESERVE_NUM,5,2) <= CONVERT(VARCHAR(10),:to,23)
    AND R.RESERVE_FLAG = 'M'
    AND R.RESERVE_JINRYO IN ('','5','6','7')
    AND RH.MEMO = '예약저장'
    -- 제외 마커(테스트/재검/차트있음/가상계정/B2B군인/더미고객). NULL 컬럼은 ISNULL로 ''치환해
    -- NULL 전파(unknown)로 정상행이 누락되거나 ETC=NULL이라고 마커행이 통과되던 버그를 막는다.
    AND NOT (
         ISNULL(R.CUST_NAME,'') LIKE '%테스트%' OR ISNULL(R.CUST_NAME,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%시뮬레이션%' OR ISNULL(R.COMMENT,'') LIKE '%중복DB%'
      OR ISNULL(R.COMMENT,'') LIKE '%중복예약%' OR ISNULL(R.COMMENT,'') LIKE '%차트있음%' OR ISNULL(R.COMMENT,'') LIKE '%재검%'
      OR ISNULL(C.ETC,'') LIKE '%홍보실 가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상데이터%' OR ISNULL(C.ETC,'') LIKE '%시뮬레이션%'
      OR ISNULL(C.ETC,'') LIKE '%테스트%' OR ISNULL(C.ETC,'') LIKE '%TEST%' OR ISNULL(C.ETC,'') LIKE '%차트있음%' OR R.RESERVE_SEQ='8' OR R.RESERVE_SEQ='5'
      OR ISNULL(R.COMMENT,'') LIKE '%테스트%' OR ISNULL(R.COMMENT,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%B2B(군인)%'
      OR R.CUST_NUM='8888888888888' )
),
-- 네이버 접수: RESERVATION(NAVER 경로) 등록일 카운트(#naver, 1회 스캔).
-- 취소(RESERVE_STATE='C')는 사유 무관 전부 사용자취소로 마킹 → 예약수에서 제외(레거시 RsvStt='C' 정합).
-- (구: cancelReason LIKE '%네이버%' 만 취소로 봐서, 취소사유가 비어있는 네이버 취소건이 예약수에 오집계됐음.)
CH_07 AS (
  SELECT CASE WHEN state='C' THEN '네이버_사용자취소'
              ELSE '네이버_접수' END AS [GB],
         '' AS [GB2], regDate AS [예약날짜], PK
  FROM #naver
),
-- 네이버 파트너거절: 확정 전 거절(RESERVATION_NAVER, RsvNum 없는 취소). 유효접수 = 접수 − 거절.
CH_REJ AS (
  SELECT '네이버_거절' AS [GB], '' AS [GB2],
         CONVERT(VARCHAR(10), NrsRgtDtm, 23) AS [예약날짜],
         'NRJ' + CONVERT(VARCHAR(20), IDX) AS PK
  FROM RESERVATION_NAVER WITH(NOLOCK)
  WHERE NrsRgtDtm >= :from AND NrsRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
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
    CONVERT(VARCHAR(23), InsertedDateTime, 21) AS PK
  FROM HappyTalk_Counsel_List H WITH(NOLOCK)
  LEFT JOIN HappyTalk_Mapping M WITH(NOLOCK) ON H.HappyTalk_Num = M.HappyTalk_Num
  INNER JOIN HappyTalk_Category01 C01 WITH(NOLOCK) ON C01.Seq = H.Category01
  LEFT JOIN HappyTalk_Category02 C02 WITH(NOLOCK) ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
  WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND C01.Name = '수술전'
),
CH_09 AS (
  SELECT DISTINCT
    CASE WHEN R.RESERVE_STATE IN ('I','H') THEN '내원'
         WHEN R.RESERVE_STATE IN ('Y') AND R.RESERVE_DATE < CAST(GETDATE() AS DATE) THEN '예약부도'
         WHEN R.RESERVE_STATE IN ('C') THEN '취소' END AS [GB],
    CASE WHEN R.RESERVE_PATH IN ('ONLINE','APP') THEN '홈페이지' ELSE '' END AS [GB2],
    R.RESERVE_DATE AS [예약날짜],
    CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK)
  RIGHT JOIN CUSTOM C WITH(NOLOCK) ON C.CUST_NUM = R.CUST_NUM
  INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  WHERE R.RESERVE_DATE >= :from AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND R.RESERVE_FLAG = 'M'
    AND R.RESERVE_JINRYO IN ('','5','6','7')
    AND RH.MEMO = '예약저장'
    -- 제외 마커(테스트/재검/차트있음/가상계정/B2B군인/더미고객). NULL 컬럼은 ISNULL로 ''치환해
    -- NULL 전파(unknown)로 정상행이 누락되거나 ETC=NULL이라고 마커행이 통과되던 버그를 막는다.
    AND NOT (
         ISNULL(R.CUST_NAME,'') LIKE '%테스트%' OR ISNULL(R.CUST_NAME,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%시뮬레이션%' OR ISNULL(R.COMMENT,'') LIKE '%중복DB%'
      OR ISNULL(R.COMMENT,'') LIKE '%중복예약%' OR ISNULL(R.COMMENT,'') LIKE '%차트있음%' OR ISNULL(R.COMMENT,'') LIKE '%재검%'
      OR ISNULL(C.ETC,'') LIKE '%홍보실 가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상계정%' OR ISNULL(C.ETC,'') LIKE '%가상데이터%' OR ISNULL(C.ETC,'') LIKE '%시뮬레이션%'
      OR ISNULL(C.ETC,'') LIKE '%테스트%' OR ISNULL(C.ETC,'') LIKE '%TEST%' OR ISNULL(C.ETC,'') LIKE '%차트있음%' OR R.RESERVE_SEQ='8' OR R.RESERVE_SEQ='5'
      OR ISNULL(R.COMMENT,'') LIKE '%테스트%' OR ISNULL(R.COMMENT,'') LIKE '%TEST%' OR ISNULL(R.COMMENT,'') LIKE '%B2B(군인)%'
      OR R.CUST_NUM='8888888888888' )
),
CH_ALL AS (
  SELECT GB, GB2, PK, [예약날짜] FROM CH_03
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_04
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_05
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_06
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_07
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_REJ
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_08
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_09
),
R AS (
  SELECT CONVERT(VARCHAR(10), CtiRgtDtm, 23) AS RESERVE_DATE, CtiCallID AS PK FROM CtiRptLst WITH(NOLOCK)
   WHERE CtiRgtDtm >= :from AND CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT CONVERT(VARCHAR(10), assign_date, 23), CONVERT(CHAR(100), DBCust_num) FROM DB_CUSTOM WITH(NOLOCK)
   WHERE assign_date >= :from AND assign_date < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT CONVERT(VARCHAR(10), InsertedDateTime, 23), CONVERT(CHAR(100), Pkey) FROM DB_ReCounsel WITH(NOLOCK)
   WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
  -- 홈페이지(CH_06)와 동일하게 예약등록일(RESERVE_NUM YYMMDD) 기준으로 PK·날짜를 맞춰야 조인됨.
  UNION SELECT '20'+SUBSTRING(RESERVE_NUM,1,2)+'-'+SUBSTRING(RESERVE_NUM,3,2)+'-'+SUBSTRING(RESERVE_NUM,5,2), HISTORY_NUM
    FROM RESERVE_HISTORY WITH(NOLOCK)
   WHERE HISTORY_TIME >= DATEADD(DAY,-1,CONVERT(datetime,:from)) AND HISTORY_TIME < DATEADD(DAY,2,CONVERT(datetime,:to))
     AND '20'+SUBSTRING(RESERVE_NUM,1,2)+'-'+SUBSTRING(RESERVE_NUM,3,2)+'-'+SUBSTRING(RESERVE_NUM,5,2) >= CONVERT(VARCHAR(10),:from,23)
     AND '20'+SUBSTRING(RESERVE_NUM,1,2)+'-'+SUBSTRING(RESERVE_NUM,3,2)+'-'+SUBSTRING(RESERVE_NUM,5,2) <= CONVERT(VARCHAR(10),:to,23)
  UNION SELECT CONVERT(VARCHAR(10), RESERVE_DATE, 23), RESERVE_NUM FROM RESERVATION WITH(NOLOCK)
   WHERE RESERVE_DATE >= :from AND RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT CONVERT(VARCHAR(10), InsertedDateTime, 23), CONVERT(VARCHAR(23), InsertedDateTime, 21) FROM HappyTalk_Counsel_List WITH(NOLOCK)
   WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT regDate, PK FROM #naver
  UNION SELECT CONVERT(VARCHAR(10), NrsRgtDtm, 23), 'NRJ' + CONVERT(VARCHAR(20), IDX) FROM RESERVATION_NAVER WITH(NOLOCK)
   WHERE NrsRgtDtm >= :from AND NrsRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
     AND RsvStt='C' AND ISNULL(RsvNum,'')=''
     AND NOT (CusNam LIKE '%테스트%' OR CusNam LIKE '%TEST%')
)
SELECT
  Z.RESERVE_DATE AS d,
  CH01 AS inboundCall, CH02 AS answeredCall, CH03 AS newInquiry, CH04 AS callReservation,
  CH05 AS tmTotalDb, CH06 AS tmValidDb, CH07 AS tmReservation, CH08 AS tmRecounsel,
  CH09 AS tmRecounselValid, CH10 AS tmRecounselReservation,
  CH11 AS homeReceived, CH12 AS homeReservation,
  CH13 AS naverReceived, CH14 AS naverRejected, CH15 AS naverValid, CH16 AS naverReservation,
  CH17 AS kakaoInquiry, CH18 AS kakaoReservation,
  CH19 AS cancelCallNaver, CH20 AS cancelHome, CH21 AS cancelKakao,
  CH22 AS visit, CH23 AS noShowReservation, CH24 AS cancel
FROM (
  SELECT
    R.RESERVE_DATE AS RESERVE_DATE,
    MAX(CH_01.인입콜) AS CH01,
    MAX(CH_01.응대콜) AS CH02,
    SUM(CASE WHEN CH.GB='검사_신규예약문의' OR CH.GB='검사_예약' THEN 1 ELSE 0 END) AS CH03,
    SUM(CASE WHEN CH.GB='검사_예약' OR CH.GB='검사_추가예약' THEN 1 ELSE 0 END) AS CH04,
    SUM(CASE WHEN CH.GB='TM_예약' OR CH.GB='TM_유효DB' OR CH.GB='TM' THEN 1 ELSE 0 END) AS CH05,
    SUM(CASE WHEN CH.GB='TM_유효DB' OR CH.GB='TM_예약' THEN 1 ELSE 0 END) AS CH06,
    SUM(CASE WHEN CH.GB='TM_예약' THEN 1 ELSE 0 END) AS CH07,
    SUM(CASE WHEN CH.GB='TM_재상담' OR CH.GB='TM_재상담유효' OR CH.GB='TM_재상담예약' THEN 1 ELSE 0 END) AS CH08,
    SUM(CASE WHEN CH.GB='TM_재상담유효' OR CH.GB='TM_재상담예약' THEN 1 ELSE 0 END) AS CH09,
    SUM(CASE WHEN CH.GB='TM_재상담예약' THEN 1 ELSE 0 END) AS CH10,
    SUM(CASE WHEN CH.GB='홈페이지_예약' OR CH.GB='홈페이지' THEN 1 ELSE 0 END) AS CH11,
    SUM(CASE WHEN CH.GB='홈페이지_예약' THEN 1 ELSE 0 END) AS CH12,
    -- 네이버(레거시 RSS 정합): 접수=원천(RESERVATION네이버 + 파트너거절), 유효=접수−거절(=RESERVATION네이버),
    -- 예약=유효−네이버사용자취소(=비취소 RESERVATION네이버). 파트너거절은 RESERVATION에 안 들어오므로
    -- 접수에 더해 한 번만 차감한다(이전엔 접수에서 빠져 있는데도 또 빼서 유효·예약이 거절수만큼 과소집계됐음).
    SUM(CASE WHEN CH.GB IN ('네이버_접수','네이버_사용자취소','네이버_거절') THEN 1 ELSE 0 END) AS CH13,
    SUM(CASE WHEN CH.GB='네이버_거절' THEN 1 ELSE 0 END) AS CH14,
    SUM(CASE WHEN CH.GB IN ('네이버_접수','네이버_사용자취소') THEN 1 ELSE 0 END) AS CH15,
    SUM(CASE WHEN CH.GB='네이버_접수' THEN 1 ELSE 0 END) AS CH16,
    SUM(CASE WHEN CH.GB='카카오톡_문의' OR CH.GB='카카오톡_예약' OR CH.GB='카카오톡_취소' THEN 1 ELSE 0 END) AS CH17,
    SUM(CASE WHEN CH.GB='카카오톡_예약' THEN 1 ELSE 0 END) AS CH18,
    SUM(CASE WHEN CH.GB='취소' AND CH.GB2<>'홈페이지' THEN 1 ELSE 0 END) AS CH19,
    SUM(CASE WHEN CH.GB='취소' AND CH.GB2='홈페이지' THEN 1 ELSE 0 END) AS CH20,
    SUM(CASE WHEN CH.GB='카카오톡_취소' THEN 1 ELSE 0 END) AS CH21,
    SUM(CASE WHEN CH.GB='내원' THEN 1 ELSE 0 END) AS CH22,
    SUM(CASE WHEN CH.GB='예약부도' THEN 1 ELSE 0 END) AS CH23,
    SUM(CASE WHEN CH.GB='취소' THEN 1 ELSE 0 END) AS CH24
  FROM R
  -- PK+예약날짜 조인. 소스 간 PK 충돌(2026-06 검증: 전부 RSV↔HIST=같은 예약의 RESERVE_NUM≡HISTORY_NUM)이
  -- 있어도 각 CH 행은 자기 GB 컬럼에 1회만 집계되어 합계 불변 → SRC 분리 불필요(검증 완료).
  LEFT JOIN CH_ALL CH ON CH.PK = R.PK AND CH.예약날짜 = R.RESERVE_DATE
  LEFT JOIN CH_01 ON R.RESERVE_DATE = CH_01.예약날짜
  GROUP BY R.RESERVE_DATE
) Z
ORDER BY Z.RESERVE_DATE
