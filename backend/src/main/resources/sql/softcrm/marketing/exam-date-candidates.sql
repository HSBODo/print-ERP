-- 검사일 기반 매칭 후보: 해당 날짜에 검사예약(RESERVE_FLAG='M', 미취소)이 있던 고객.
-- 날짜가 후보군을 좁혀 주므로 이름 대조만으로 매칭 신뢰도가 확보된다.
-- 성능 주의 (실측 hang 사례):
--  1) 조인 키에 RTRIM 금지 — MSSQL '=' 는 후행 공백을 무시하므로 raw 비교로 인덱스를 태운다.
--  2) jtds 는 문자열 파라미터를 NVARCHAR 로 보내므로, varchar 컬럼과 비교 시 컬럼이 변환돼
--     인덱스가 무력화될 수 있다 — 파라미터 쪽을 CONVERT(varchar)로 고정한다.
SELECT
    CONVERT(varchar(10), CONVERT(date, r.RESERVE_DATE), 120) AS eventDate,
    RTRIM(r.CUST_NUM)                                        AS customerNo,
    RTRIM(ISNULL(c.CUST_NAME, ''))                           AS name,
    ISNULL(c.BIRTH_DAY, '')                                  AS birthDate
FROM RESERVATION r WITH(NOLOCK)
JOIN CUSTOM c WITH(NOLOCK) ON c.CUST_NUM = r.CUST_NUM
WHERE r.RESERVE_FLAG = 'M'
  AND r.RESERVE_STATE <> 'C'
  AND r.RESERVE_DATE >= CONVERT(varchar(10), :from)
  AND r.RESERVE_DATE < CONVERT(varchar(10), :toExclusive)
  AND CONVERT(varchar(10), CONVERT(date, r.RESERVE_DATE), 120) IN (:values)
GROUP BY CONVERT(varchar(10), CONVERT(date, r.RESERVE_DATE), 120), RTRIM(r.CUST_NUM),
         RTRIM(ISNULL(c.CUST_NAME, '')), ISNULL(c.BIRTH_DAY, '')
