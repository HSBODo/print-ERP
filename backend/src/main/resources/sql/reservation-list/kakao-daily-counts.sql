-- 카카오(해피톡) 일별 신규 신환 예약 건수 — 마트 배치 적재용.
-- 원본 kakao-count.sql 을 일자 단위로 분해. 등록일(InsertedDateTime) 기준, ms 단위 등록시각 distinct.
SELECT
    CONVERT(varchar(10), H.InsertedDateTime, 23) AS dt,
    COUNT(DISTINCT CONVERT(varchar(23), H.InsertedDateTime, 21)) AS kakaoCount
FROM HappyTalk_Counsel_List H WITH(NOLOCK)
INNER JOIN HappyTalk_Category01 C01 ON C01.Seq = H.Category01
LEFT JOIN HappyTalk_Category02 C02 ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
WHERE H.InsertedDateTime >= :from
  AND H.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))
  AND C01.Name = '수술전'
  AND C02.NAME = '★신환'
GROUP BY CONVERT(varchar(10), H.InsertedDateTime, 23)
