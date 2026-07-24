-- 온라인 예약 구성요소 ③ 홈페이지 — 월별 리스트 화면 raw 건수. [postgres-mart]
--
-- 2026-07-24 예약자 리스트_홈페이지 화면 건수와 정합. 예약 종합·월간 레포트 모두 이 값을 참조한다.
--
-- 리스트 화면(select-list-reservation-homepage.sql) 과 동일한 필터·계산:
--   · exam_type 필터 없음 — 백내장(2)·노안(21)·렌즈삽입(24,25)·미상(1) 모두 포함
--   · dedup 없음         — 같은 사람 여러 신청건도 각각 카운트
--   · COUNT(*)           — 리스트가 그대로 보여주는 raw 건수
-- 회귀 기준: from=2026-06-01 / to=2026-06-30 → 206건 (리스트 화면과 동일).
--
-- 소스판(../{sqlite,mariadb}/monthly-list-raw.sql) 과 결과 계약(yr·mo·cnt) 동일해야 함.
-- 배치가 이미 CATEGORY='COUNSELONLINE' · DEL_TF='N' 을 걸어 넣었기 때문에 여기서는 재적용하지 않는다.
--
-- ⚠️ 네이버·카카오는 시력교정만 집계 — 이 홈페이지 판만 전 진료 포함이라 진료 범위 비대칭(의도적).
-- ⚠️ 마트는 배치 이후로만 최신이라, 마지막 배치 이후 등록건은 여기 없다 — 호출부(ReservationOverallStatsService)
--    가 last-reg-date 와 함께 확인해 부분 월을 null 로 끊는다.
SELECT EXTRACT(YEAR  FROM reg_date)::INTEGER AS "yr",
       EXTRACT(MONTH FROM reg_date)::INTEGER AS "mo",
       COUNT(*)                              AS "cnt"
  FROM mart_list_reservation_homepage
 WHERE reg_date >= CAST(:from AS TIMESTAMP)
   AND reg_date <  CAST(:to   AS TIMESTAMP) + INTERVAL '1 day'
 GROUP BY EXTRACT(YEAR FROM reg_date), EXTRACT(MONTH FROM reg_date)
 ORDER BY "yr", "mo"
