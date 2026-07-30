-- 외래수 일별 — 주차 레포트 #28. sql/outpatient/find-outpatient-count-monthly.sql 의 일별 버전.
-- RESERVATION F + STATE I/H, 외래수 리스트와 동일 모집단.
-- (2026-06 검증: 일별 합계 3477 = 월별 3477)
-- ⚠️ find-outpatient-count-monthly.sql 의 WHERE 를 고치면 이 파일도 같이 고칠 것.
SELECT SUBSTRING(r.RESERVE_DATE, 1, 10) AS d,
       COUNT(*) AS cnt
FROM RESERVATION r WITH(NOLOCK)
JOIN CUSTOM cu WITH(NOLOCK) ON r.CUST_NUM = cu.CUST_NUM
WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
  AND r.RESERVE_FLAG = 'F'
  AND r.RESERVE_STATE IN ('I','H')
  AND NOT (
    ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
    OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
  )
GROUP BY SUBSTRING(r.RESERVE_DATE, 1, 10)
ORDER BY d
