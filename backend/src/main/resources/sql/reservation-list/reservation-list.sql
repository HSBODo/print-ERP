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
  ISNULL(mv.motiveM, '')                                  AS motiveM
FROM RESERVATION r WITH(NOLOCK)
OUTER APPLY (
  SELECT TOP 1 ISNULL(m2.category02_name, '') AS motiveM
  FROM MOTIVE_NEW02 m2 WITH(NOLOCK)
  WHERE m2.cust_num = r.CUST_NUM AND m2.Idx = '1'
  ORDER BY m2.pkey DESC
) mv
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
