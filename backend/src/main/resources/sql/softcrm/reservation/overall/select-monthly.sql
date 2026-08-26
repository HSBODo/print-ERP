SELECT YEAR(r.InsertedDateTime) AS yr,
       MONTH(r.InsertedDateTime) AS mo,
       COUNT(DISTINCT CASE WHEN (r.RESERVE_PATH IN ('CTI', 'CRM'))
                             OR r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')
                           THEN r.RESERVE_NUM END) AS cnt,
       COUNT(DISTINCT CASE WHEN r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')
                           THEN r.RESERVE_NUM END) AS online_cnt,
       COUNT(DISTINCT CASE WHEN r.RESERVE_PATH IN ('CTI', 'CRM') THEN r.RESERVE_NUM END) AS call_cnt
FROM RESERVATION r WITH(NOLOCK)
WHERE r.InsertedDateTime >= :from AND r.InsertedDateTime <= :to
  AND r.RESERVE_FLAG = 'M'
  AND r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')
  AND NOT (r.CUST_NAME LIKE '%테스트%' OR r.CUST_NAME LIKE '%TEST%' OR r.CUST_NUM = '8888888888888')
  AND (ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')
    AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%' AND ISNULL(r.COMMENT, '') NOT LIKE '%재검%'
    AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
    AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
    )
GROUP BY YEAR(r.InsertedDateTime), MONTH(r.InsertedDateTime)
ORDER BY yr, mo
