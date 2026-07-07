SET NOCOUNT ON;
WITH
-- 인입콜/응대콜: EICN 콜센터 상담원 그룹 기준. 백내장 전담팀 = group_code='0016'(2명: user249·user276).
-- 인입 큐(hunt_number)는 시력교정과 공유하므로 큐가 아니라 응대 상담원 그룹으로 분리한다.
-- 시력교정 RSS의 CH_01과 동일 방식(dcontext='hunt_context', in_total=인입/in_success=응대). 2026-06-23 = 29/29 검증.
-- ⚠️ 한계(휴가·부재): 이 지표는 "백내장팀이 응대한 콜"이라 팀원 1명이 부재하면 과소집계된다. 부재 시 그 사람 몫의
--    백내장 큐(00022221103, IVR '0003_0003') 콜이 시력교정팀(0015)으로 오버플로 응대되는데, EICN에는 그 콜이
--    백내장 문의였는지 식별할 차원이 없어 라이브로 복원 불가(레거시도 inbound_inner+수기보정 포함이라 EICN 단독 비재현).
--    예: 2026-06-24 user276 휴가 → 라이브 17/17 vs 레거시(노안백내장 RSS) 30/29. 이런 날은 PDF/레거시 값으로 스냅샷 수기 보정.
--    (2026-06-17 user249 부재 시에도 동일: PDF 30 vs EICN 19) — 메모 reservation-stats-cataract-datasource 참조.
CH_01 AS (
  SELECT CONVERT(VARCHAR(10), stat_date, 23) AS [예약날짜], inbound AS [인입콜], answered AS [응대콜]
  FROM OPENQUERY(EICN_MySQL,
    'SELECT stat_date, SUM(in_total) AS inbound, SUM(in_success) AS answered
       FROM stat_user_inbound_bseye
      WHERE stat_date BETWEEN ''__OQ_FROM__'' AND ''__OQ_TO__''
        AND dcontext = ''hunt_context''
        AND group_code = ''0016''
      GROUP BY stat_date')
),
CH_CALL AS (
  SELECT DISTINCT
    CASE
      WHEN a.CtiGbnCod='S' AND a.CtiCtgCod='9' AND a.CtiDtlCod1='21' AND a.CtiDtlCod2='21' AND a.CtiDtlCod3='28' AND ISNULL(b.ClgIOF,'I')='I' THEN '백내장_재문의'
      -- 추가예약(A/H/10/31): 레거시 백내장신환(★예약)엔 포함, 백내장신규(신규검사문의)엔 미포함 → 별도 GB로 분리(총예약만 가산).
      WHEN a.CtiGbnCod='A' AND a.CtiCtgCod='H' AND a.CtiDtlCod1='10' AND a.CtiDtlCod2='31' THEN '백내장_추가예약'
      -- ★신환: 레거시 uCATARACT8Sql 백내장신환 브랜치와 동일 코드셋. S/9/21/9(상담등록 ★신환)는 레거시 ★신환엔 없고 신규문의 전용이라 여기서 제외.
      WHEN (a.CtiGbnCod='A' AND a.CtiCtgCod='H' AND a.CtiDtlCod1='10' AND a.CtiDtlCod2 IN ('28','32'))
        OR (a.CtiGbnCod='S' AND a.CtiCtgCod='9' AND a.CtiDtlCod1='21' AND a.CtiDtlCod2='41')
        OR (a.CtiGbnCod='M' AND a.CtiCtgCod='H' AND a.CtiDtlCod1='7' AND a.CtiDtlCod2='5') THEN '백내장_신환'
      -- 신규문의: S/9/21/21은 신환재상담(Cod3='28')을 제외(레거시 백내장신규의 Cod3<>'28' OR NULL 가드). 발신 Cod3='28'은 재문의(수신만)에도 안 잡혀 미집계됨.
      -- S/9/21/9(상담등록 ★신환)는 레거시 백내장신규(신규검사문의)에만 있고 ★신환엔 미포함 → 여기서 집계해 newExamInquiry로만 반영(newPatient·totalCataract 미가산).
      WHEN a.CtiGbnCod='S' AND a.CtiCtgCod='9' AND a.CtiDtlCod1='21'
        AND ((a.CtiDtlCod2='21' AND (a.CtiDtlCod3<>'28' OR a.CtiDtlCod3 IS NULL)) OR a.CtiDtlCod2 IN ('32','9')) THEN '백내장_신규문의'
      ELSE '' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), a.CtiRgtDtm, 23) AS [예약날짜], CONVERT(VARCHAR(100), a.CtiCallID) AS PK
  FROM CtiRptLst a WITH(NOLOCK) LEFT JOIN CtiClg b WITH(NOLOCK) ON a.CtiCallID = b.ClgNum
  WHERE a.CtiRgtDtm >= :from AND a.CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND ((a.CtiCtgCod='H' AND a.CtiDtlCod1 IN ('10','7')) OR (a.CtiCtgCod='9' AND a.CtiDtlCod1='21'))
),
CH_KAKAO AS (
  SELECT DISTINCT
    CASE WHEN C01.Name='백내장검사' AND C02.Name LIKE '★신환%' THEN '카톡_검사예약'
         WHEN C02.Name='노안' THEN '카톡_노안'
         WHEN C02.Name='예약취소' THEN '카톡_취소'
         ELSE '카톡_문의' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), H.InsertedDateTime, 23) AS [예약날짜], CONVERT(VARCHAR(23), H.InsertedDateTime, 21) AS PK
  FROM HappyTalk_Counsel_List H WITH(NOLOCK)
  LEFT JOIN HappyTalk_Mapping M WITH(NOLOCK) ON H.HappyTalk_Num = M.HappyTalk_Num
  INNER JOIN HappyTalk_Category01 C01 WITH(NOLOCK) ON C01.Seq = H.Category01
  LEFT JOIN HappyTalk_Category02 C02 WITH(NOLOCK) ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
  WHERE H.InsertedDateTime >= :from AND H.InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND C01.Name IN ('백내장검사','백내장외래')
),
CH_RES AS (
  SELECT DISTINCT
    CASE WHEN RH.RESERVE_PATH IN ('ONLINE','APP','NAVER') THEN '백내장_온라인예약' ELSE '백내장_예약' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), RH.HISTORY_TIME, 23) AS [예약날짜], CONVERT(VARCHAR(100), RH.HISTORY_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK) INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  WHERE RH.HISTORY_TIME >= :from AND RH.HISTORY_TIME < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND R.RESERVE_FLAG='H' AND R.RESERVE_STATE<>'C' AND R.RESERVE_JINRYO<>'16' AND RH.MEMO='예약저장'
    AND R.CUST_NUM<>'8888888888888' AND NOT (R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%')
),
CH_VISIT AS (
  SELECT DISTINCT
    CASE WHEN R.RESERVE_STATE='Y' AND R.RESERVE_DATE < CAST(GETDATE() AS DATE) THEN '백내장_부도'
         WHEN R.RESERVE_STATE='C' THEN '백내장_취소' END AS GB,
    CASE WHEN R.RESERVE_PATH IN ('ONLINE','APP','NAVER') THEN 'ONLINE' ELSE 'CRM' END AS GB2,
    R.RESERVE_DATE AS [예약날짜], CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK) INNER JOIN RESERVE_HISTORY RH WITH(NOLOCK) ON R.RESERVE_NUM = RH.RESERVE_NUM
  WHERE R.RESERVE_DATE >= :from AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND R.RESERVE_FLAG='H' AND R.RESERVE_JINRYO NOT IN ('16','13') AND RH.MEMO='예약저장'
    -- 수술당일(JINRYO='13') 슬롯은 검사 예약 funnel이 아니므로 부도/취소 집계에서 제외
    AND R.CUST_NUM<>'8888888888888' AND NOT (R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%')
),
-- 내원: 백내장 예약(FLAG='H') 중 실제 내원(STATE 접수 I/퇴원 H)이면서 ①신규 검사 슬롯(진료실 일반검사 '1'·OP전검사 '2')이거나
--       ②같은 날 백내장 검사기록(Cataract_Exam, 중단 제외) 보유분. 재검사(3·4)·수술당일(13)·진료실(16) 등은 검사기록 없으면 제외,
--       협진/타과는 FLAG='H' 예약이 없어 자연 배제. 레거시 roster(RESERVATION I/H)+PDF 내원과 일치(6/15~24 전부).
--       ※ Cataract_Exam 단독 방식은 일반검사 내원자가 검사기록 미생성 시 누락(6/24 2 vs 레거시 4) → STATE 기반으로 교정(2026-06-25).
CH_EXAM AS (
  SELECT DISTINCT '백내장_내원' AS GB, '' AS GB2, R.RESERVE_DATE AS [예약날짜], CONVERT(VARCHAR(100), R.RESERVE_NUM) AS PK
  FROM RESERVATION R WITH(NOLOCK)
  WHERE R.RESERVE_DATE >= :from AND R.RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND R.RESERVE_FLAG='H' AND R.RESERVE_STATE IN ('I','H')
    AND R.CUST_NUM<>'8888888888888' AND NOT (R.CUST_NAME LIKE '%테스트%' OR R.CUST_NAME LIKE '%TEST%')
    AND ( R.RESERVE_JINRYO IN ('1','2')
       OR EXISTS (SELECT 1 FROM Cataract_Exam e WITH(NOLOCK)
                  WHERE LTRIM(RTRIM(e.CUST_NUM)) = LTRIM(RTRIM(R.CUST_NUM))
                    AND e.EXAM_DATE = R.RESERVE_DATE AND ISNULL(e.Stop_YN,'') <> 'Y') )
),
-- 아웃바운드 TM: DB_CUSTOM(백내장 TM팀 4명 = 시력교정이 제외하던 직원, B2B 군 제외). TM_Gubun 단계: 1000=예약·2000=유효DB.
CH_TM AS (
  SELECT DISTINCT
    CASE WHEN TM_Gubun='1000' THEN 'TM_예약' WHEN TM_Gubun='2000' THEN 'TM_유효' ELSE 'TM_DB' END AS GB,
    '' AS GB2, CONVERT(VARCHAR(10), assign_date, 23) AS [예약날짜], CONVERT(VARCHAR(100), DBCust_num) AS PK
  FROM DB_CUSTOM WITH(NOLOCK)
  WHERE assign_date >= :from AND assign_date < DATEADD(DAY,1,CONVERT(datetime,:to))
    AND TM_EMP IN ('KC0307','BV1119','BV1207','BV0067') AND ISNULL(Gubun,'') NOT LIKE 'B2B%'
),
CH_ALL AS (
  SELECT GB, GB2, PK, [예약날짜] FROM CH_CALL
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_KAKAO
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_RES
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_VISIT
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_EXAM
  UNION ALL SELECT GB, GB2, PK, [예약날짜] FROM CH_TM
),
R AS (
  SELECT CONVERT(VARCHAR(10), CtiRgtDtm, 23) AS RESERVE_DATE, CONVERT(VARCHAR(100), CtiCallID) AS PK FROM CtiRptLst WITH(NOLOCK)
   WHERE CtiRgtDtm >= :from AND CtiRgtDtm < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT CONVERT(VARCHAR(10), InsertedDateTime, 23), CONVERT(VARCHAR(23), InsertedDateTime, 21) FROM HappyTalk_Counsel_List WITH(NOLOCK)
   WHERE InsertedDateTime >= :from AND InsertedDateTime < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT CONVERT(VARCHAR(10), HISTORY_TIME, 23), CONVERT(VARCHAR(100), HISTORY_NUM) FROM RESERVE_HISTORY WITH(NOLOCK)
   WHERE HISTORY_TIME >= :from AND HISTORY_TIME < DATEADD(DAY,1,CONVERT(datetime,:to))
  UNION SELECT CONVERT(VARCHAR(10), RESERVE_DATE, 23), CONVERT(VARCHAR(100), RESERVE_NUM) FROM RESERVATION WITH(NOLOCK)
   WHERE RESERVE_DATE >= :from AND RESERVE_DATE < DATEADD(DAY,1,CONVERT(datetime,:to))
  -- 내원도 RESERVATION(RESERVE_NUM) 기반이라 위 RESERVATION 브랜치로 PK가 모두 포함됨 → Cataract_Exam 브랜치 불필요(제거).
  UNION SELECT CONVERT(VARCHAR(10), assign_date, 23), CONVERT(VARCHAR(100), DBCust_num) FROM DB_CUSTOM WITH(NOLOCK)
   WHERE assign_date >= :from AND assign_date < DATEADD(DAY,1,CONVERT(datetime,:to))
     AND TM_EMP IN ('KC0307','BV1119','BV1207','BV0067') AND ISNULL(Gubun,'') NOT LIKE 'B2B%'
)
SELECT
  Z.RESERVE_DATE AS d,
  Z.totalCataract, 0 AS totalPresbyopia, Z.inboundCall, Z.answeredCall,
  Z.newExamInquiry, Z.newReInquiry, Z.newPatient,
  Z.tmTotalDb, Z.tmValidDb, Z.tmReservation,
  Z.kakaoTotalInquiry, Z.kakaoCataractReservation, Z.kakaoPresbyopiaReservation,
  Z.onlineReservation, Z.onlineNoShow,
  Z.cancelOnline, Z.cancelCrm, Z.cancelKakao,
  Z.visit, Z.noShowReservation, Z.cancel
FROM (
  SELECT R.RESERVE_DATE AS RESERVE_DATE,
    MAX(CH_01.[인입콜]) AS inboundCall,
    MAX(CH_01.[응대콜]) AS answeredCall,
    SUM(CASE WHEN CH.GB IN ('백내장_신환','백내장_추가예약','카톡_검사예약','백내장_온라인예약','TM_예약') THEN 1 ELSE 0 END) AS totalCataract,
    SUM(CASE WHEN CH.GB IN ('백내장_신규문의','백내장_신환') THEN 1 ELSE 0 END) AS newExamInquiry,
    SUM(CASE WHEN CH.GB='백내장_재문의' THEN 1 ELSE 0 END) AS newReInquiry,
    SUM(CASE WHEN CH.GB IN ('백내장_신환','백내장_추가예약') THEN 1 ELSE 0 END) AS newPatient,
    SUM(CASE WHEN CH.GB IN ('TM_예약','TM_유효','TM_DB') THEN 1 ELSE 0 END) AS tmTotalDb,
    SUM(CASE WHEN CH.GB IN ('TM_예약','TM_유효') THEN 1 ELSE 0 END) AS tmValidDb,
    SUM(CASE WHEN CH.GB='TM_예약' THEN 1 ELSE 0 END) AS tmReservation,
    SUM(CASE WHEN CH.GB IN ('카톡_검사예약','카톡_노안','카톡_취소','카톡_문의') THEN 1 ELSE 0 END) AS kakaoTotalInquiry,
    SUM(CASE WHEN CH.GB='카톡_검사예약' THEN 1 ELSE 0 END) AS kakaoCataractReservation,
    SUM(CASE WHEN CH.GB='카톡_노안' THEN 1 ELSE 0 END) AS kakaoPresbyopiaReservation,
    SUM(CASE WHEN CH.GB='백내장_온라인예약' THEN 1 ELSE 0 END) AS onlineReservation,
    -- 온라인 부도수 = 전체 예약 부도(noShowReservation와 동일 값). 레거시 '온라인 부도수'는 경로 무관
    -- 전체 예약 부도와 일치한다(백내장 온라인경로 예약 ≈ 0, 부도는 전부 CTI/CRM 경로). 2026-06 PDF·6/24 레거시 검증.
    SUM(CASE WHEN CH.GB='백내장_부도' THEN 1 ELSE 0 END) AS onlineNoShow,
    SUM(CASE WHEN CH.GB='백내장_취소' AND CH.GB2='ONLINE' THEN 1 ELSE 0 END) AS cancelOnline,
    SUM(CASE WHEN CH.GB='백내장_취소' AND CH.GB2='CRM' THEN 1 ELSE 0 END) AS cancelCrm,
    SUM(CASE WHEN CH.GB='카톡_취소' THEN 1 ELSE 0 END) AS cancelKakao,
    SUM(CASE WHEN CH.GB='백내장_내원' THEN 1 ELSE 0 END) AS visit,
    SUM(CASE WHEN CH.GB='백내장_부도' THEN 1 ELSE 0 END) AS noShowReservation,
    SUM(CASE WHEN CH.GB='백내장_취소' THEN 1 ELSE 0 END) AS cancel
  FROM R
  LEFT JOIN CH_ALL CH ON CH.PK = R.PK AND CH.[예약날짜] = R.RESERVE_DATE
  LEFT JOIN CH_01 ON CH_01.[예약날짜] = R.RESERVE_DATE
  GROUP BY R.RESERVE_DATE
) Z
ORDER BY Z.RESERVE_DATE
