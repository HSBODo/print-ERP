-- 수술일 기반 매칭 후보: 해당 날짜에 수술 기록(OPERATIONDATA)이 있는 고객.
-- 성능 주의는 exam-date-candidates.sql 참고 (조인 키 RTRIM 금지, 파라미터 varchar 고정).
SELECT
    CONVERT(varchar(10), CONVERT(date, o.OPERATION_DATE), 120) AS eventDate,
    RTRIM(o.CUST_NUM)                                          AS customerNo,
    RTRIM(ISNULL(c.CUST_NAME, ''))                             AS name,
    ISNULL(c.BIRTH_DAY, '')                                    AS birthDate
FROM OPERATIONDATA o WITH(NOLOCK)
JOIN CUSTOM c WITH(NOLOCK) ON c.CUST_NUM = o.CUST_NUM
WHERE (ISNULL(o.OPERATIONR, '') <> '' OR ISNULL(o.OPERATIONL, '') <> '')
  AND o.OPERATION_DATE >= CONVERT(varchar(10), :from)
  AND o.OPERATION_DATE < CONVERT(varchar(10), :toExclusive)
  AND CONVERT(varchar(10), CONVERT(date, o.OPERATION_DATE), 120) IN (:values)
GROUP BY CONVERT(varchar(10), CONVERT(date, o.OPERATION_DATE), 120), RTRIM(o.CUST_NUM),
         RTRIM(ISNULL(c.CUST_NAME, '')), ISNULL(c.BIRTH_DAY, '')
