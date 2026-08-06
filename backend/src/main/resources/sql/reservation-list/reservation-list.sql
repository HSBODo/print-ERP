SELECT
  CONVERT(varchar(10), r.InsertedDateTime, 23)            AS registeredAt,
  ISNULL(CONVERT(varchar(5), r.InsertedDateTime, 108), '') AS registeredTime,
  ISNULL(r.RESERVE_DATE, '')                              AS reserveDate,
  ISNULL(LTRIM(RTRIM(r.START_TIME)), '')                  AS reserveTime,
  ISNULL(LTRIM(RTRIM(r.CUST_NUM)), '')                    AS chartNo,
  ISNULL(r.CUST_NAME, '')                                 AS name,
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
  -- CRM 에 값이 없으면 메모의 `TM고객(대분류/중분류)` 정형 문구에서 끌어온다.
  -- 상담사가 메모엔 적어 뒀는데 MOTIVE_NEW02 로 옮기지 않은 건이 많다
  -- (2026-07: 139건 — 이벤트상담신청 58·전화상담관리 52·본인 15·모두닥 10·바비톡 2·카페 2).
  -- ⚠️ 원천(CRM)은 고치지 않는다. 조회 시점 보완이라 CRM 에 값이 채워지면 그쪽이 우선된다.
  -- ⚠️ motiveMSource 로 출처를 구분한다 — 등록값과 메모 추출값을 섞어 세면 안 된다.
  ISNULL(NULLIF(mv.motiveM, ''), ISNULL(memoMv.motiveM, '')) AS motiveM,
  CASE WHEN ISNULL(mv.motiveM, '') <> '' THEN 'CRM'
       WHEN ISNULL(memoMv.motiveM, '') <> '' THEN 'MEMO'
       ELSE '' END                                        AS motiveMSource,
  -- 예약 이후 흐름 3종 — 이 예약으로 이어진 첫 건만 본다(예약일 이전 기록은 무관).
  --   검사등록일 : EXAM 에 등록 시각 컬럼이 없어 **검사일**을 쓴다.
  --   검사중단   : 그 검사의 STOP_YN (2026-07 예약 14,025건 중 Y 49건).
  --   수술등록일 : 수술예약(FLAG='O')을 잡은 날. 취소(C)는 뺀다. 날짜만.
  ISNULL(ex.examDate, '')                                 AS examRegDate,
  CASE WHEN ex.stopYn = 'Y' THEN 'Y'
       WHEN ex.examDate IS NULL THEN ''
       ELSE 'N' END                                       AS examStop,
  ISNULL(sx.regDate, '')                                  AS surgeryRegDate
FROM RESERVATION r WITH(NOLOCK)
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
  SELECT TOP 1 ISNULL(m2.category02_name, '') AS motiveM
  FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
  WHERE m2.cust_num = r.CUST_NUM AND m2.Idx = '1'
  ORDER BY m2.pkey DESC
) mv
-- 메모 파싱 — `TM고객(` 뒤 첫 '/' 부터, 다음 '/' · ')' · 줄바꿈 중 먼저 오는 것까지가 중분류.
-- 끝 문자를 덧붙여 CHARINDEX 가 0 을 돌려주는 경우(구분자 없음)를 없앤다.
-- ⚠️ 줄바꿈도 종결로 본다 — `TM고객(` 괄호를 안 닫은 메모가 있어(2026-01: 1건)
--    다음 줄 "1)렌즈종류" 의 ')' 까지 끌고 와 값에 개행이 섞였다.
OUTER APPLY (
  SELECT sp = CASE WHEN CHARINDEX(N'TM고객(', r.COMMENT) > 0
                   THEN CHARINDEX(N'/', r.COMMENT, CHARINDEX(N'TM고객(', r.COMMENT) + 5)
                   ELSE 0 END
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
                        ELSE '' END
) memoMv
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
  AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%' AND ISNULL(r.COMMENT, '') NOT LIKE '%재검%'
  AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
  AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
ORDER BY r.InsertedDateTime, r.RESERVE_NUM
