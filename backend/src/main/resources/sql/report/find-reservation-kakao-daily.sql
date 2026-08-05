-- 온라인 예약 구성요소 ② 카카오톡(해피톡) — 일별. sql/reservation-overall/monthly-kakao.sql 의 일별 버전.
-- 밀리초 타임스탬프 dedup 도 동일. ⚠️ monthly-kakao.sql 을 고치면 이 파일도 같이 고칠 것.
SELECT CONVERT(varchar(10), H.InsertedDateTime, 23) AS d,
       COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21)) AS kakao_cnt
FROM HappyTalk_Counsel_List H WITH(NOLOCK)
INNER JOIN HappyTalk_Category01 C01 ON C01.Seq = H.Category01
LEFT JOIN HappyTalk_Category02 C02 ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
WHERE H.InsertedDateTime >= :from AND H.InsertedDateTime <= :to
  AND C01.Name = '수술전'
  AND C02.NAME = '★신환'
GROUP BY CONVERT(varchar(10), H.InsertedDateTime, 23)
ORDER BY d
