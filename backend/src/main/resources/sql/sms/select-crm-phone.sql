-- 차트번호로 CRM 연락처 조회 (MSSQL 원천).
--
-- 마트에 없는 사람의 번호를 채우는 마지막 보루다. 재수술 환자가 그렇다 —
-- 원 수술이 마트 적재 시작(2026-01) 이전이면 list_surgery·list_exam·list_reservation
-- 어디에도 안 잡혀 번호를 찾을 수 없다(2026-08 실측 1건).
--
-- CALL_NUM2 가 휴대폰이다(예약자 리스트 hp 와 같은 규칙). 010 이 아니면 CALL_NUM1 을 본다.
SELECT TOP 1
  REPLACE(REPLACE(
    CASE
      WHEN REPLACE(ISNULL(c.CALL_NUM2, ''), '-', '') LIKE '010%' THEN c.CALL_NUM2
      WHEN REPLACE(ISNULL(c.CALL_NUM1, ''), '-', '') LIKE '010%' THEN c.CALL_NUM1
      WHEN ISNULL(c.CALL_NUM2, '') <> '' THEN c.CALL_NUM2
      ELSE ISNULL(c.CALL_NUM1, '')
    END, '-', ''), ' ', '') AS phone
FROM CUSTOM c WITH(NOLOCK)
WHERE LTRIM(RTRIM(c.CUST_NUM)) = :chartNo
