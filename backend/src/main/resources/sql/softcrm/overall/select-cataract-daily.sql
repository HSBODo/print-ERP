            SELECT base.d AS d,
                   SUM(base.rightEye) + SUM(base.leftEye) AS examCount,
                   SUM(CASE WHEN (base.rightEye = 1 OR base.leftEye = 1)
                              AND base.hasSurgeryBooking = 1 THEN 1 ELSE 0 END) AS surgeryBooked
            FROM (
                SELECT ce.EXAM_DATE AS d,
                       CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONR, ''))), '') IS NOT NULL THEN 1 ELSE 0 END AS rightEye,
                       CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONL, ''))), '') IS NOT NULL THEN 1 ELSE 0 END AS leftEye,
                       CASE WHEN op.hasSurgeryBooking IS NULL THEN 0 ELSE 1 END AS hasSurgeryBooking
                FROM Cataract_Exam ce WITH(NOLOCK)
                JOIN CUSTOM cu WITH(NOLOCK) ON ce.CUST_NUM = cu.CUST_NUM
                OUTER APPLY (
                    SELECT TOP 1 1 AS hasSurgeryBooking
                    FROM RESERVATION op WITH(NOLOCK)
                    WHERE op.CUST_NUM = ce.CUST_NUM
                      AND op.RESERVE_FLAG = 'O'
                      AND op.RESERVE_STATE <> 'C'
                ) op
                WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
                  AND (ce.Stop_YN IS NULL OR ce.Stop_YN <> 'Y')
                  AND (ce.Cancel_CD IS NULL OR LTRIM(RTRIM(ce.Cancel_CD)) = '')
                  AND NOT (
                    ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                    OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                  )
                  AND EXISTS (
                    SELECT 1
                    FROM RESERVATION r WITH(NOLOCK)
                    WHERE r.CUST_NUM = ce.CUST_NUM
                      AND r.RESERVE_DATE = ce.EXAM_DATE
                      AND r.RESERVE_STATE IN ('I','H')
                      AND r.RESERVE_FLAG = 'H'
                  )
            ) base
            GROUP BY base.d
            ORDER BY base.d
