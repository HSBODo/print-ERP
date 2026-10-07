-- 전화 뒷8자리·이메일 매칭용 CUSTOM 전체 스트림 (MSSQL 정본).
-- 사용처: OverseasMarketingRepository.findCandidatesByPhoneOrEmail — 서버 사이드에서 non-sargable
--        정규화를 피하고 Java 에서 필터링. fetchSize 2000 으로 스트리밍.
-- 함정: WHERE 절 없이 전수 스캔한다. 다른 쿼리와 라이프사이클·튜닝이 완전히 다르니 변경 금지.
SELECT RTRIM(c.CUST_NUM) AS customerNo,
       RTRIM(ISNULL(c.CUST_NAME, '')) AS name,
       ISNULL(c.BIRTH_DAY, '') AS birthDate,
       ISNULL(c.CALL_NUM2, '') AS contact,
       ISNULL(c.EMAIL, '') AS email
FROM CUSTOM c WITH(NOLOCK)
