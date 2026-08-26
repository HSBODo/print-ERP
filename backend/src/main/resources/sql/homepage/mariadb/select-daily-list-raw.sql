-- 온라인 예약 구성요소 ③ 홈페이지 — 일별(주차 레포트용). [MariaDB · 실시간]
-- select-monthly-list-raw.sql 의 일별 버전. 필터·계산 동일하고 버킷만 월→일이다.
-- ⚠️ select-monthly-list-raw.sql 을 고치면 이 파일과 ../sqlite/select-daily-list-raw.sql ·
--    sql/mart/reservation/select-list-reservation-homepage-daily-list-raw.sql 도 같이 고칠 것 (계약: d·cnt).
SELECT DATE_FORMAT(REG_DATE, '%Y-%m-%d') AS `d`,
       COUNT(*)                          AS `cnt`
  FROM TBL_COUNSEL
 WHERE CATEGORY = 'COUNSELONLINE'
   AND DEL_TF = 'N'
   AND COALESCE(M_NM, '') NOT LIKE '%테스트%'
   AND COALESCE(M_NM, '') NOT LIKE '%TEST%'
   AND REG_DATE >= :from
   AND REG_DATE <  DATE_ADD(:to, INTERVAL 1 DAY)
 GROUP BY DATE_FORMAT(REG_DATE, '%Y-%m-%d')
 ORDER BY `d`
