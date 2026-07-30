-- 온라인 예약 구성요소 ① 네이버 — 일별. sql/reservation-overall/monthly-naver.sql 의 일별 버전.
-- WHERE 절 동일(RSS 기준). ⚠️ monthly-naver.sql 을 고치면 이 파일도 같이 고칠 것.
SELECT CONVERT(varchar(10), r.InsertedDateTime, 23) AS d,
       COUNT(DISTINCT r.RESERVE_NUM) AS naver_cnt
FROM RESERVATION r WITH(NOLOCK)
WHERE r.InsertedDateTime >= :from AND r.InsertedDateTime <= :to
  AND r.RESERVE_PATH = 'NAVER'
  AND r.RESERVE_FLAG = 'M'
  AND r.RESERVE_JINRYO IN ('', '5', '6', '7')
  AND ISNULL(r.RESERVE_STATE, '') <> 'C'
GROUP BY CONVERT(varchar(10), r.InsertedDateTime, 23)
ORDER BY d
