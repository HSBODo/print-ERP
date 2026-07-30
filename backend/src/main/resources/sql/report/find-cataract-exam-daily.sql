-- 백내장 검사수 일별 — 주차 레포트 #11. sql/exam/find-cataract-monthly.sql 의 일별 버전.
--
-- 원본이 (CUST_NUM, 월) DISTINCT 인 것을 (CUST_NUM, 일) DISTINCT 로 바꾼다.
-- 같은 달에 백내장검사 예약으로 두 번 내원한 고객은 월 기준 1명 / 주차 기준 2명이 된다.
-- (2026-06 검증: 일별 합계 55 = 월별 55 — 실제 중복 내원은 드물다)
--
-- ⚠️ find-cataract-monthly.sql 의 WHERE·분류 규칙을 고치면 이 파일도 같이 고칠 것.
--    특히 `EXISTS(EMPLOYEE)` 로 검안사/상담사를 판정하는 부분은 IS NOT NULL 로 바꾸면 안 된다.
SELECT CH.d AS d,
       COUNT(*) AS cnt
FROM (
    SELECT DISTINCT
           B.CUST_NUM,
           SUBSTRING(D.RESERVE_DATE, 1, 10) AS d
    FROM CUSTOM B WITH(NOLOCK)
    JOIN RESERVATION D WITH(NOLOCK) ON D.CUST_NUM = B.CUST_NUM
    WHERE D.RESERVE_DATE >= :from AND D.RESERVE_DATE <= :to
      AND D.RESERVE_FLAG = 'H'
      AND ISNULL(D.RESERVE_JINRYO, '') <> '3'
      AND ISNULL(D.RESERVE_SEQ, 0) <> 3
      AND D.RESERVE_STATE NOT IN ('C', 'Y')
      AND B.CUST_NUM <> '9999999999999'
      AND NOT (
        ISNULL(B.CUST_NAME, '') LIKE N'%테스트%'
        OR LOWER(ISNULL(B.CUST_NAME, '')) LIKE '%test%'
      )
) CH
JOIN CUSTOM B WITH(NOLOCK) ON B.CUST_NUM = CH.CUST_NUM
WHERE EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK) WHERE E.EMP_NUM = B.MY_OPTOMETRIST)
  AND (
    B.MY_COUNSELOR = 'BS0808'
    OR EXISTS (SELECT 1 FROM EMPLOYEE E WITH(NOLOCK) WHERE E.EMP_NUM = B.MY_COUNSELOR)
  )
GROUP BY CH.d
ORDER BY d
