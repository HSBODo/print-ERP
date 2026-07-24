            -- 검사수(월간레포트 c-exam-count) 범위 집계 = EXAM 행수 + Cataract_Exam 세션수 (원시 COUNT, 무필터).
            -- find-total-exam-count-monthly.sql 과 동일 기준을 from~to 범위 단일값으로 반환.
            SELECT
              (SELECT COUNT(*) FROM EXAM e WITH(NOLOCK)
                 WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to) AS visionCount,
              (SELECT COUNT(*) FROM Cataract_Exam ce WITH(NOLOCK)
                 WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to) AS cataractCount
