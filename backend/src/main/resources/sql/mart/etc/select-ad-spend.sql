-- 그 달의 매체별 광고비. 입력 전이면 빈 결과이며 화면이 0 으로 채운다.
SELECT ym, media, amount_manwon
  FROM ad_spend
 WHERE ym = :ym
 ORDER BY media
