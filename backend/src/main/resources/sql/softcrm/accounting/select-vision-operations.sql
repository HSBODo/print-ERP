-- 기간 내 수납 고객의 수술 목록 — 수납일과 가장 가까운 수술 1건을 Java 가 골라 신상 정보(수술일·집도의·수술방법)로 붙인다.
-- 회계 원형 _build-crm.js Q_OP.
SELECT LTRIM(RTRIM(o.CUST_NUM))      AS custNum,
       o.OPERATION_DATE              AS operationDate,
       RTRIM(ISNULL(o.OPERATIONR,'')) AS procedureRight,
       RTRIM(ISNULL(o.OPERATIONL,'')) AS procedureLeft,
       ISNULL(d.EMP_NAME, '')        AS surgeon
FROM OPERATIONDATA o WITH(NOLOCK)
LEFT JOIN EMPLOYEE d WITH(NOLOCK) ON d.EMP_NUM = o.OPERATION_DOC
WHERE EXISTS (SELECT 1 FROM CstPrcSub s WITH(NOLOCK)
              WHERE s.CstCusNum = o.CUST_NUM AND s.CstDte >= :from AND s.CstDte <= :to)
