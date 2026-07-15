-- 온라인 예약 구성요소 ① 네이버 — 예약통계_시력교정(RSS) 의 '네이버 예약수' 와 동일 기준.
--
-- 2026-06 부터 온라인 예약 = 네이버 + 카카오톡 + 홈페이지(중복제외) 로 재정의되면서 신설.
-- 기준을 RSS(sql/reservation-stats/system-daily-counts.sql 의 CH16=네이버_접수)에 맞춘다:
--   - RESERVE_PATH='NAVER', RESERVE_FLAG='M'(시력교정 — 백내장 H 는 애초에 못 들어옴)
--   - RESERVE_JINRYO IN ('','5','6','7')  ← RSS 와 동일. 종합의 ('24','25') 는 FLAG='M' 에 0건이라 무관
--   - 취소(RESERVE_STATE='C') 제외 — RSS 의 '네이버_접수' 는 취소를 뺀 값이다
--   - B2B/재검/중복 등 정크 제외는 적용하지 않는다 — RSS 가 적용하지 않기 때문
--
-- ⚠️ 그래서 이 값은 기존 종합 SQL 의 NAVER 집계와 일부러 다르다. 맞추려 하지 말 것.
SELECT YEAR(r.InsertedDateTime)  AS yr,
       MONTH(r.InsertedDateTime) AS mo,
       COUNT(DISTINCT r.RESERVE_NUM) AS naver_cnt
FROM RESERVATION r WITH(NOLOCK)
WHERE r.InsertedDateTime >= :from AND r.InsertedDateTime <= :to
  AND r.RESERVE_PATH = 'NAVER'
  AND r.RESERVE_FLAG = 'M'
  AND r.RESERVE_JINRYO IN ('', '5', '6', '7')
  AND ISNULL(r.RESERVE_STATE, '') <> 'C'
GROUP BY YEAR(r.InsertedDateTime), MONTH(r.InsertedDateTime)
ORDER BY yr, mo
