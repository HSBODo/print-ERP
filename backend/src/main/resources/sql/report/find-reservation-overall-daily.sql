-- 예약 종합(콜/온라인) 일별 — 주차 레포트용.
--
-- sql/reservation-overall/monthly.sql 의 일별 버전. WHERE 절은 동일하고 버킷만 월→일이다.
-- (2026-06 검증: 일별 합계 = 월별 1345/462/883 정확 일치)
-- ⚠️ monthly.sql 의 WHERE 를 고치면 이 파일도 같이 고칠 것.
SELECT CONVERT(varchar(10), r.InsertedDateTime, 23) AS d,
       COUNT(DISTINCT CASE WHEN (r.RESERVE_PATH IN ('CTI', 'CRM'))
                             OR r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')
                           THEN r.RESERVE_NUM END) AS cnt,
       COUNT(DISTINCT CASE WHEN r.RESERVE_PATH IN ('ONLINE', 'APP', 'NAVER')
                           THEN r.RESERVE_NUM END) AS online_cnt,
       COUNT(DISTINCT CASE WHEN r.RESERVE_PATH IN ('CTI', 'CRM') THEN r.RESERVE_NUM END) AS call_cnt
FROM RESERVATION r WITH(NOLOCK)
WHERE r.InsertedDateTime >= :from AND r.InsertedDateTime <= :to
  AND r.RESERVE_FLAG = 'M'
  AND r.RESERVE_JINRYO IN ('', '5', '6', '7', '24', '25')
  AND NOT (r.CUST_NAME LIKE '%테스트%' OR r.CUST_NAME LIKE '%TEST%' OR r.CUST_NUM = '8888888888888')
  AND (ISNULL(r.RESERVE_SEQ, '') NOT IN ('8', '5')
    AND ISNULL(r.COMMENT, '') NOT LIKE '%B2B(군인)%' AND ISNULL(r.COMMENT, '') NOT LIKE '%재검%'
    AND ISNULL(r.COMMENT, '') NOT LIKE '%중복%' AND ISNULL(r.COMMENT, '') NOT LIKE '%시뮬%'
    AND ISNULL(r.COMMENT, '') NOT LIKE '%차트있음%'
    )
GROUP BY CONVERT(varchar(10), r.InsertedDateTime, 23)
ORDER BY d
