-- 시력교정 상담 지표 일별 — 주차 레포트 #19(일반예약률) · #21(상담성공률 3종).
-- sql/consultation/find-monthly-vision-rates.sql 의 일별 버전 (버킷만 월→일, WHERE 동일).
-- EXAM 행 단위 COUNT/SUM 이라 일별 합계 = 월별 값과 항상 일치한다.
-- ⚠️ find-monthly-vision-rates.sql 을 고치면 이 파일도 같이 고칠 것.
SELECT t.d AS d,
    COUNT(*) AS examCount,
    SUM(t.counsel) AS counselCount,
    SUM(t.booked) AS surgeryBookedCount,
    SUM(CASE WHEN t.od = 0 THEN 1 ELSE 0 END) AS examGeneral,
    SUM(CASE WHEN t.od = 0 AND t.booked = 1 THEN 1 ELSE 0 END) AS bookedGeneral,
    SUM(CASE WHEN t.od = 1 AND t.counsel = 1 THEN 1 ELSE 0 END) AS counselOneday,
    SUM(CASE WHEN t.od = 1 AND t.counsel = 1 AND t.booked = 1 THEN 1 ELSE 0 END) AS counselBookedOneday,
    SUM(CASE WHEN t.od = 0 AND t.counsel = 1 THEN 1 ELSE 0 END) AS counselGeneral,
    SUM(CASE WHEN t.od = 0 AND t.counsel = 1 AND t.booked = 1 THEN 1 ELSE 0 END) AS counselBookedGeneral
FROM (
    SELECT SUBSTRING(E.EXAM_DATE, 1, 10) AS d,
        CASE WHEN ISNULL(E.STOP_YN,'') <> 'Y'
              AND (RTRIM(ISNULL(E.OPERATIONR,'')) <> '' OR RTRIM(ISNULL(E.OPERATIONL,'')) <> '')
             THEN 1 ELSE 0 END AS counsel,
        CASE WHEN rs.MIN_RSV_DATE IS NOT NULL THEN 1 ELSE 0 END AS booked,
        CASE WHEN EXISTS (
                SELECT 1 FROM RESERVATION r WITH(NOLOCK)
                 WHERE r.CUST_NUM = E.CUST_NUM AND r.RESERVE_DATE = E.EXAM_DATE
                   AND r.RESERVE_FLAG = 'M' AND r.RESERVE_STATE IN ('I','H') AND r.RESERVE_JINRYO = '5'
             ) THEN 1 ELSE 0 END AS od
    FROM EXAM E WITH(NOLOCK)
    LEFT JOIN (
        SELECT CUST_NUM, MIN(RESERVE_DATE) AS MIN_RSV_DATE
          FROM RESERVATION WITH(NOLOCK)
         WHERE RESERVE_FLAG = 'O' AND RESERVE_STATE <> 'C'
         GROUP BY CUST_NUM
    ) rs ON rs.CUST_NUM = E.CUST_NUM
    WHERE E.EXAM_DATE >= :from AND E.EXAM_DATE <= :to
        AND ISNULL(E.CANCEL_CD,'') = ''
) t
GROUP BY t.d
ORDER BY d
