-- 마트가 담고 있는 마지막 등록일시. [postgres-mart]
--
-- 배치 이관 후에는 소스 실시간이 아니라 '마지막 배치 시점의 원본 max' 다 — 스냅샷과 같은
-- 의미('천장')를 갖는다. 화면은 조회 종료일이 이 값보다 크면 경고 배너를 띄운다
-- (ReservationListHomepageResult.live=false 로 내려간다).
--
-- 소스판(sql/reservation-list-homepage/{sqlite,mariadb}/last-reg-date.sql) 과 결과 계약(문자열 1개) 동일.
SELECT COALESCE(TO_CHAR(MAX(reg_date), 'YYYY-MM-DD HH24:MI:SS'), '') AS "lastRegDate"
  FROM mart_list_reservation_homepage
