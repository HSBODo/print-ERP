-- 온라인 예약 구성요소 ② 카카오톡 — 예약통계_시력교정(RSS) 의 '카카오톡 예약수' 와 동일 기준.
--
-- 2026-01 부터 온라인 예약에 카카오가 포함되면서 신설.
-- ⚠️ 그 전(2024·2025)까지 카카오는 종합에서 '의도적으로' 빠져 있었다 — 레거시 RSS 가 월마다 포함/미포함이
--    들쭉날쭉해 일관성을 위해 뺀 것이었다. 2026-01 부터는 마트가 직접 계산하므로 포함한다.
--
-- 카카오는 RESERVATION 에 거의 안 잡힌다(RESERVE_PATH 없음) — 해피톡이 원천이다.
-- 기준은 sql/reservation-list/kakao-count.sql / RSS 의 CH18(카카오톡_예약) 과 동일:
--   - C01.Name='수술전' AND C02.NAME='★신환'  → 신규 예약건
--   - 밀리초 타임스탬프로 dedup (동일 상담이 다건으로 적재되는 원본 특성)
SELECT YEAR(H.InsertedDateTime)  AS yr,
       MONTH(H.InsertedDateTime) AS mo,
       COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21)) AS kakao_cnt
FROM HappyTalk_Counsel_List H WITH(NOLOCK)
INNER JOIN HappyTalk_Category01 C01 ON C01.Seq = H.Category01
LEFT JOIN HappyTalk_Category02 C02 ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
WHERE H.InsertedDateTime >= :from AND H.InsertedDateTime <= :to
  AND C01.Name = '수술전'
  AND C02.NAME = '★신환'
GROUP BY YEAR(H.InsertedDateTime), MONTH(H.InsertedDateTime)
ORDER BY yr, mo
