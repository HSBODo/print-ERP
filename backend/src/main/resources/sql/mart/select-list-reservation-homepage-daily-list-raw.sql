-- 온라인 예약 구성요소 ③ 홈페이지 — 일별 리스트 화면 raw 건수(주차 레포트용). [postgres-mart]
-- select-list-reservation-homepage-select-monthly-list-raw.sql 의 일별 버전 (계약: d·cnt).
-- 배치가 이미 CATEGORY='COUNSELONLINE' · DEL_TF='N' 을 걸어 넣었기 때문에 여기서는 재적용하지 않는다.
SELECT TO_CHAR(reg_date, 'YYYY-MM-DD') AS "d",
       COUNT(*)                        AS "cnt"
  FROM mart_list_reservation_homepage
 WHERE reg_date >= CAST(:from AS TIMESTAMP)
   AND reg_date <  CAST(:to   AS TIMESTAMP) + INTERVAL '1 day'
 GROUP BY TO_CHAR(reg_date, 'YYYY-MM-DD')
 ORDER BY "d"
