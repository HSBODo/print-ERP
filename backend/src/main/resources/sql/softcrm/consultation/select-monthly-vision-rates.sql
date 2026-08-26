            SELECT t.yr, t.mo,
                COUNT(*) AS examCount,
                SUM(t.counsel) AS counselCount,
                SUM(t.booked) AS surgeryBookedCount,
                SUM(t.actual) AS actualSurgeryCount,
                SUM(CASE WHEN t.od = 0 THEN 1 ELSE 0 END) AS examGeneral,
                SUM(CASE WHEN t.od = 0 AND t.booked = 1 THEN 1 ELSE 0 END) AS bookedGeneral,
                SUM(CASE WHEN t.od = 1 AND t.counsel = 1 THEN 1 ELSE 0 END) AS counselOneday,
                SUM(CASE WHEN t.od = 1 AND t.counsel = 1 AND t.booked = 1 THEN 1 ELSE 0 END) AS counselBookedOneday,
                SUM(CASE WHEN t.od = 0 AND t.counsel = 1 THEN 1 ELSE 0 END) AS counselGeneral,
                SUM(CASE WHEN t.od = 0 AND t.counsel = 1 AND t.booked = 1 THEN 1 ELSE 0 END) AS counselBookedGeneral
            FROM (
                SELECT YEAR(E.EXAM_DATE) AS yr, MONTH(E.EXAM_DATE) AS mo,
                    CASE WHEN ISNULL(E.STOP_YN,'') <> 'Y'
                          AND (RTRIM(ISNULL(E.OPERATIONR,'')) <> '' OR RTRIM(ISNULL(E.OPERATIONL,'')) <> '')
                         THEN 1 ELSE 0 END AS counsel,
                    CASE WHEN rs.MIN_RSV_DATE IS NOT NULL THEN 1 ELSE 0 END AS booked,
                    CASE WHEN mo.MIN_OP_DATE IS NOT NULL THEN 1 ELSE 0 END AS actual,
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
                LEFT JOIN (
                    SELECT CUST_NUM, MIN(OPERATION_DATE) AS MIN_OP_DATE
                      FROM OPERATIONDATA WITH(NOLOCK)
                     GROUP BY CUST_NUM
                ) mo ON mo.CUST_NUM = E.CUST_NUM
                WHERE E.EXAM_DATE >= :from AND E.EXAM_DATE <= :to
                    AND ISNULL(E.CANCEL_CD,'') = ''
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
