SELECT
  CONVERT(varchar(10), r.InsertedDateTime, 23)            AS registeredAt,
  ISNULL(CONVERT(varchar(5), r.InsertedDateTime, 108), '') AS registeredTime,
  ISNULL(r.RESERVE_DATE, '')                              AS reserveDate,
  ISNULL(LTRIM(RTRIM(r.START_TIME)), '')                  AS reserveTime,
  ISNULL(LTRIM(RTRIM(r.CUST_NUM)), '')                    AS chartNo,
  ISNULL(r.CUST_NAME, '')                                 AS name,
  -- 사람 식별용 연락처 2종 — 화면·CSV 에 내보내지 않는다(개인정보). 마트에만 싣고 중복 판별에만 쓴다.
  --   CALL_NUM2 가 휴대폰이다. CALL_NUM1 은 208/2227 건뿐이고 CALL_NUM3 은 0 건(2026-07).
  --   커버리지 휴대폰 98.2% → 이메일까지 합치면 99.94%(둘 다 없는 건 1건).
  --   하이픈·공백을 없애 저장한다 — 같은 번호가 표기만 달라 다른 사람으로 세는 걸 막는다.
  REPLACE(REPLACE(ISNULL(r.CALL_NUM2, ''), '-', ''), ' ', '') AS hp,
  LOWER(LTRIM(RTRIM(ISNULL(r.Email, ''))))                AS email,
  ISNULL(r.RESERVE_STATE, '')                             AS reserveState,
  CASE
    WHEN r.RESERVE_PATH = 'CTI' THEN '인콜'
    WHEN r.RESERVE_PATH = 'CRM' THEN '아웃콜'
    WHEN r.RESERVE_PATH = 'ONLINE' THEN '홈페이지'
    WHEN r.RESERVE_PATH = 'APP' THEN '앱'
    WHEN r.RESERVE_PATH = 'NAVER' THEN '네이버'
    WHEN r.RESERVE_PATH = 'KAKAO' THEN '카카오'
    ELSE ISNULL(r.RESERVE_PATH, '')
  END                                                     AS channel,
  CASE
    WHEN r.RESERVE_PATH IN ('CTI', 'CRM') THEN '콜'
    WHEN r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER', 'KAKAO') THEN '온라인'
    ELSE '기타'
  END                                                     AS channelGroup,
  ISNULL(doc.EMP_NAME, '')                                AS doctor,
  ISNULL(cns.EMP_NAME, '')                                AS counselor,
  ISNULL(r.COMMENT, '')                                   AS comment,
  -- 내원동기(중) — 실제 유입처가 들어온다('모두닥'·'인터넷검색(홈페이지)' 등).
  -- 검사자 리스트(find-exam-list.sql)와 같은 규칙: Idx='1' 최신 1건.
  --
  -- CRM 에 값이 없으면 메모의 `TM고객(대분류/중분류)` 또는
  -- `CTI고객(대분류/중분류)` 정형 문구에서 끌어온다.
  -- 정형 문구도 없으면 매체명이 명확한 모두닥·크리에이트립만 문자열 fallback 한다.
  -- 상담사가 메모엔 적어 뒀는데 MOTIVE_NEW02 로 옮기지 않은 건이 많다
  -- (2026-07: 139건 — 이벤트상담신청 58·전화상담관리 52·본인 15·모두닥 10·바비톡 2·카페 2).
  -- ⚠️ 원천(CRM)은 고치지 않는다. 조회 시점 보완이라 CRM 에 값이 채워지면 그쪽이 우선된다.
  -- ⚠️ motiveMSource 로 출처를 구분한다 — 등록값과 메모 추출값을 섞어 세면 안 된다.
  -- 내원동기(대)는 (중)과 짝이라 같은 행(같은 출처)에서 뽑는다 — CRM 값이 있으면 CRM 쌍,
  -- 없으면 메모 쌍. 섞으면 대=CRM/중=메모 같은 어긋난 조합이 나온다.
  --
  -- 텔레매니저 TM 배정 DB(tmdb)가 모두닥 리드로 갖고 있는 예약은 **CRM 보다도 앞세운다**.
  -- 2026-07 실측 누락 5건: CRM 내원동기에 B2B(비앤빛) 등 다른 값이 먼저 들어가 모두닥이 묻힌 게 2건,
  -- CRM·메모 어디에도 흔적이 없는 게 3건. 배정 DB 의 Gubun='M_모두닥이벤트' 가 가장 깨끗한 식별자다.
  -- 출처는 motiveMSource='TMDB' 로 남긴다.
  CASE WHEN tmdb.hit = 1 THEN N'광고'
       WHEN ISNULL(mv.motiveM, '') <> '' THEN ISNULL(mv.motiveL, '')
       ELSE ISNULL(resolvedMemoMv.motiveL, '') END        AS motiveL,
  CASE WHEN tmdb.hit = 1 THEN N'모두닥'
       ELSE ISNULL(NULLIF(mv.motiveM, ''), ISNULL(resolvedMemoMv.motiveM, '')) END AS motiveM,
  CASE WHEN tmdb.hit = 1 THEN 'TMDB'
       WHEN ISNULL(mv.motiveM, '') <> '' THEN 'CRM'
       WHEN ISNULL(resolvedMemoMv.motiveM, '') <> '' THEN 'MEMO'
       ELSE '' END                                        AS motiveMSource,
  -- 예약 이후 흐름 3종 — 이 예약으로 이어진 첫 건만 본다(예약일 이전 기록은 무관).
  --   검사등록일 : EXAM 에 등록 시각 컬럼이 없어 **검사일**을 쓴다.
  --   검사중단   : 그 검사의 STOP_YN (2026-07 예약 14,025건 중 Y 49건).
  --   수술등록일 : 수술예약(FLAG='O')을 잡은 날. 취소(C)는 뺀다. 날짜만.
  ISNULL(ex.examDate, '')                                 AS examRegDate,
  CASE WHEN ex.stopYn = 'Y' THEN 'Y'
       WHEN ex.examDate IS NULL THEN ''
       ELSE 'N' END                                       AS examStop,
  ISNULL(sx.regDate, '')                                  AS surgeryRegDate,
  -- 수술명 우/좌 — 수술자 리스트(find-surgery-list.sql)와 같은 원천·같은 제외목록이라 표기가 일치한다.
  --   시력교정 = OPERATIONDATA · 백내장 = Cataract_Operationdata(좌·우가 각각 날짜를 갖는다).
  -- 이 예약으로 이어진 **첫 수술** 1건만 붙인다(예약일 이전 수술은 다른 건).
  -- 2026-01~08 실측: 5,687건에 붙고 그중 백내장은 1건 — 드물지만 있어서 둘 다 본다.
  ISNULL(sg.opR, '')                                      AS surgeryR,
  ISNULL(sg.opL, '')                                      AS surgeryL,
  ISNULL(sg.opDate, '')                                   AS surgeryDate,
  -- 수술 수납액 — 수술자 리스트(find-surgery-list.sql)와 같은 규칙: (고객, 수술일) 의 COSTPRICE 합.
  --   PayStt='A'(취소분)는 뺀다. 대소문자가 섞여 들어와 UPPER 로 비교한다
  --   (MSSQL 은 CI 라 원래 같이 걸리지만 규칙을 명시해 둔다).
  -- 숫자만 담는다 — 화면 표기(콤마)는 프론트가 한다. 리스트는 문자열로 보여주지만
  -- 이 값은 매출·객단가 집계에 쓰이므로 계산 가능한 형태여야 한다.
  ISNULL(pay.receipt, 0)                                  AS surgeryPayment
FROM RESERVATION r WITH(NOLOCK)
OUTER APPLY (
  SELECT TOP 1 u.opDate, u.opR, u.opL
  FROM (
    SELECT op.OPERATION_DATE AS opDate,
           ISNULL(op.OPERATIONR, '') AS opR, ISNULL(op.OPERATIONL, '') AS opL
    FROM OPERATIONDATA op WITH(NOLOCK)
    WHERE op.CUST_NUM = r.CUST_NUM
      AND op.OPERATION_DATE >= ISNULL(NULLIF(r.RESERVE_DATE, ''), '9999-12-31')
      AND ( (ISNULL(op.OPERATIONR, '') <> '' AND op.OPERATIONR NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST'))
         OR (ISNULL(op.OPERATIONL, '') <> '' AND op.OPERATIONL NOT IN ('X','OP불가','모든수술가능','op x','Strabismus','TEST-TEST')) )
    UNION ALL
    SELECT c.OPERATIONR_DATE, ISNULL(c.OPERATIONR, ''), ''
    FROM Cataract_Operationdata c WITH(NOLOCK)
    WHERE c.CUST_NUM = r.CUST_NUM
      AND ISNULL(c.OPERATIONR_DATE, '') <> ''
      AND ISNULL(c.OPERATIONR, '') NOT IN ('', 'X', 'OP불가', 'TEST-TEST')
      AND c.OPERATIONR_DATE >= ISNULL(NULLIF(r.RESERVE_DATE, ''), '9999-12-31')
    UNION ALL
    SELECT c.OPERATIONL_DATE, '', ISNULL(c.OPERATIONL, '')
    FROM Cataract_Operationdata c WITH(NOLOCK)
    WHERE c.CUST_NUM = r.CUST_NUM
      AND ISNULL(c.OPERATIONL_DATE, '') <> ''
      AND ISNULL(c.OPERATIONL, '') NOT IN ('', 'X', 'OP불가', 'TEST-TEST')
      AND c.OPERATIONL_DATE >= ISNULL(NULLIF(r.RESERVE_DATE, ''), '9999-12-31')
  ) u
  ORDER BY u.opDate
) sg
OUTER APPLY (
  -- 그 수술일의 수납 합계. sg 가 고른 '이 예약으로 이어진 첫 수술' 과 같은 날짜를 본다.
  SELECT SUM(ISNULL(cp.COST_PRICE, 0)) AS receipt
  FROM COSTPRICE cp WITH(NOLOCK)
  WHERE cp.CUST_NUM = r.CUST_NUM
    AND cp.COST_DATE = sg.opDate
    AND UPPER(ISNULL(cp.PayStt, '')) <> 'A'
) pay
OUTER APPLY (
  SELECT TOP 1 e.EXAM_DATE AS examDate, ISNULL(LTRIM(RTRIM(e.STOP_YN)), '') AS stopYn
  FROM EXAM e WITH(NOLOCK)
  WHERE e.CUST_NUM = r.CUST_NUM
    AND e.EXAM_DATE >= ISNULL(NULLIF(r.RESERVE_DATE, ''), '9999-12-31')
  ORDER BY e.EXAM_DATE
) ex
OUTER APPLY (
  SELECT TOP 1 CONVERT(varchar(10), op.InsertedDateTime, 23) AS regDate
  FROM RESERVATION op WITH(NOLOCK)
  WHERE op.CUST_NUM = r.CUST_NUM
    AND op.RESERVE_FLAG = 'O'
    AND op.RESERVE_STATE <> 'C'
    AND CONVERT(varchar(10), op.InsertedDateTime, 23) >= ISNULL(NULLIF(r.RESERVE_DATE, ''), '9999-12-31')
  ORDER BY op.InsertedDateTime
) sx
OUTER APPLY (
  SELECT TOP 1 ISNULL(m2.category01_name, '') AS motiveL,
               ISNULL(m2.category02_name, '') AS motiveM
  FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
  WHERE m2.cust_num = r.CUST_NUM AND m2.Idx = '1'
  ORDER BY m2.pkey DESC
) mv
-- 메모 파싱 — `TM고객(` 또는 `CTI고객(` 뒤 첫 '/' 부터,
-- 다음 '/' · ')' · 줄바꿈 중 먼저 오는 것까지가 중분류.
-- 끝 문자를 덧붙여 CHARINDEX 가 0 을 돌려주는 경우(구분자 없음)를 없앤다.
-- ⚠️ 줄바꿈도 종결로 본다 — `TM고객(` 괄호를 안 닫은 메모가 있어(2026-01: 1건)
--    다음 줄 "1)렌즈종류" 의 ')' 까지 끌고 와 값에 개행이 섞였다.
OUTER APPLY (
  SELECT tmPos = CHARINDEX(N'TM고객(', r.COMMENT),
         ctiPos = CHARINDEX(N'CTI고객(', r.COMMENT)
) marker
OUTER APPLY (
  -- 둘 다 있으면 메모에서 먼저 나온 문구를 쓴다. markerLen 은 여는 괄호까지의 길이.
  SELECT pos = CASE
                 WHEN marker.tmPos > 0 AND (marker.ctiPos = 0 OR marker.tmPos < marker.ctiPos)
                   THEN marker.tmPos
                 ELSE marker.ctiPos
               END,
         markerLen = CASE
                       WHEN marker.tmPos > 0 AND (marker.ctiPos = 0 OR marker.tmPos < marker.ctiPos)
                         THEN 5
                       WHEN marker.ctiPos > 0 THEN 6
                       ELSE 0
                     END
) tg
OUTER APPLY (
  SELECT sp = CASE WHEN tg.pos > 0 THEN CHARINDEX(N'/', r.COMMENT, tg.pos + tg.markerLen) ELSE 0 END
) tm
OUTER APPLY (
  SELECT pClose = CASE WHEN tm.sp > 0 THEN CHARINDEX(N')', r.COMMENT + N')', tm.sp + 1) ELSE 0 END,
         pSlash = CASE WHEN tm.sp > 0 THEN CHARINDEX(N'/', r.COMMENT + N'/', tm.sp + 1) ELSE 0 END,
         pCr    = CASE WHEN tm.sp > 0 THEN CHARINDEX(CHAR(13), r.COMMENT + CHAR(13), tm.sp + 1) ELSE 0 END,
         pLf    = CASE WHEN tm.sp > 0 THEN CHARINDEX(CHAR(10), r.COMMENT + CHAR(10), tm.sp + 1) ELSE 0 END
) tp
OUTER APPLY (
  SELECT pEnd = (SELECT MIN(v) FROM (VALUES (tp.pClose), (tp.pSlash), (tp.pCr), (tp.pLf)) x(v))
) te
OUTER APPLY (
  SELECT motiveM = CASE WHEN tm.sp > 0
                        THEN LTRIM(RTRIM(SUBSTRING(r.COMMENT, tm.sp + 1, te.pEnd - tm.sp - 1)))
                        ELSE '' END,
         -- 대분류 = 'TM고객(' 과 첫 '/' 사이. 그 사이에 줄바꿈이 끼면 문구가 깨진 것이라 버린다.
         motiveL = CASE WHEN tm.sp > tg.pos + tg.markerLen
                             AND CHARINDEX(CHAR(13), SUBSTRING(r.COMMENT, tg.pos + tg.markerLen, tm.sp - tg.pos - tg.markerLen)) = 0
                             AND CHARINDEX(CHAR(10), SUBSTRING(r.COMMENT, tg.pos + tg.markerLen, tm.sp - tg.pos - tg.markerLen)) = 0
                        THEN LTRIM(RTRIM(SUBSTRING(r.COMMENT, tg.pos + tg.markerLen, tm.sp - tg.pos - tg.markerLen)))
                        ELSE '' END
) memoMv
-- 직원 소개 fallback — 직원 마스터의 실제 이름이 `이름t 소개` 형태로 적혔거나,
-- `직원소개` 문구와 직원명이 함께 있을 때만 직원명으로 인정한다.
OUTER APPLY (
  SELECT TOP 1 LTRIM(RTRIM(e.EMP_NAME)) AS employeeName
  FROM EMPLOYEE e WITH(NOLOCK)
  WHERE ISNULL(LTRIM(RTRIM(e.EMP_NAME)), '') <> ''
    AND (
         CHARINDEX(LTRIM(RTRIM(e.EMP_NAME)) + N't 소개', ISNULL(r.COMMENT, '')) > 0
      OR CHARINDEX(LTRIM(RTRIM(e.EMP_NAME)) + N' t 소개', ISNULL(r.COMMENT, '')) > 0
      OR (
           CHARINDEX(N'직원소개', ISNULL(r.COMMENT, '')) > 0
       AND CHARINDEX(LTRIM(RTRIM(e.EMP_NAME)), ISNULL(r.COMMENT, '')) > 0
      )
    )
  ORDER BY CASE WHEN e.EMP_STATE <> 'N' THEN 0 ELSE 1 END, e.EMP_NUM
) staffReferral
-- 비정형 메모 fallback — CRM/정형 문구가 모두 비었을 때만 위 SELECT 에서 사용된다.
-- 매체명, 직원 마스터로 검증한 소개, 명시적인 소개고객만 허용한다.
OUTER APPLY (
  SELECT motiveL = CASE
                     WHEN CHARINDEX(N'모두닥', ISNULL(r.COMMENT, '')) > 0 THEN N'광고'
                     WHEN CHARINDEX(N'크리에이트립', ISNULL(r.COMMENT, '')) > 0 THEN N'광고'
                     WHEN ISNULL(staffReferral.employeeName, '') <> '' THEN N'소개직원'
                     WHEN CHARINDEX(N'소개고객', ISNULL(r.COMMENT, '')) > 0 THEN N'소개미확인'
                     ELSE ''
                   END,
         motiveM = CASE
                     WHEN CHARINDEX(N'모두닥', ISNULL(r.COMMENT, '')) > 0 THEN N'모두닥'
                     WHEN CHARINDEX(N'크리에이트립', ISNULL(r.COMMENT, '')) > 0 THEN N'크리에이트립'
                     WHEN ISNULL(staffReferral.employeeName, '') <> '' THEN staffReferral.employeeName
                     WHEN CHARINDEX(N'소개고객', ISNULL(r.COMMENT, '')) > 0 THEN N'소개고객'
                     ELSE ''
                   END
) fallbackMv
OUTER APPLY (
  SELECT motiveL = CASE WHEN ISNULL(memoMv.motiveM, '') <> ''
                        THEN memoMv.motiveL ELSE fallbackMv.motiveL END,
         motiveM = CASE WHEN ISNULL(memoMv.motiveM, '') <> ''
                        THEN memoMv.motiveM ELSE fallbackMv.motiveM END
) resolvedMemoMv
-- 텔레매니저 TM 배정 DB 대조 — 이 예약이 모두닥 이벤트 리드(Gubun='M_모두닥이벤트')에서 왔으면 1.
-- RESERVE_NUM 은 char 라 뒤 공백이 달라도 = 비교로 매칭된다. 빈 예약번호끼리 붙는 걸 막으려고
-- 배정 DB 쪽 예약번호가 채워진 행만 본다.
OUTER APPLY (
  SELECT TOP 1 1 AS hit
  FROM DB_CUSTOM d WITH(NOLOCK)
  WHERE d.RESERVE_NUM = r.RESERVE_NUM
    AND ISNULL(RTRIM(d.RESERVE_NUM), '') <> ''
    AND ISNULL(d.Gubun, '') LIKE N'%모두닥%'
) tmdb
LEFT JOIN EMPLOYEE doc WITH(NOLOCK)
  ON doc.EMP_NUM = ISNULL(NULLIF(r.SELECT_DOC, ''), r.RESERVE_DOC)
 AND doc.EMP_STATE <> 'N'
LEFT JOIN EMPLOYEE cns WITH(NOLOCK)
  ON cns.EMP_NUM = r.RESERVE_EMP
WHERE r.InsertedDateTime >= :from
  AND r.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))
  AND r.RESERVE_FLAG = 'M'
  AND r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')
  AND NOT (r.CUST_NAME LIKE '%테스트%' OR r.CUST_NAME LIKE '%TEST%' OR r.CUST_NUM = '8888888888888')
  AND r.RESERVE_PATH IN ('CTI', 'CRM', 'ONLINE', 'APP', 'NAVER')
  AND ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')
  AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%'
  -- '재검' 제외는 **상담 안내 문구를 걷어낸 뒤** 검사한다. "산동거부(추후 재검가능성ok)",
  -- "수술 진행시 재검 필요함 안내ok" 같은 신규 예약 메모가 재검으로 오인돼 빠졌다
  -- (2026-01~08 실측 오탐 17건 — 전부 안내 문구, 진짜 재검 예약 5건은 아래 패턴에 안 걸려 유지).
  -- 공백을 없앤 사본에서 안내 문구 6종을 지운 뒤 '재검'이 남는 경우만 제외한다.
  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        ISNULL(r.COMMENT, ''), ' ', ''),
        N'재검가능성', ''), N'재검사안내', ''), N'재검안내', ''),
        N'재검사필요', ''), N'재검필요', ''), N'재검사진행', '')
      NOT LIKE '%재검%'
  AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
  AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
ORDER BY r.InsertedDateTime, r.RESERVE_NUM
