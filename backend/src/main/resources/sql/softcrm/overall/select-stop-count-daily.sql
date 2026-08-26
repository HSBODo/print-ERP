            SELECT e.EXAM_DATE AS d, COUNT(*) AS cnt
            FROM EXAM e WITH(NOLOCK)
            WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
              AND ISNULL(e.STOP_YN, '') = 'Y'
            GROUP BY e.EXAM_DATE
            ORDER BY e.EXAM_DATE
