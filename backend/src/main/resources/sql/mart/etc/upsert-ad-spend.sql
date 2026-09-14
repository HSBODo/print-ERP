-- 광고비 저장(월 × 매체). 0 도 유효한 값이라 지우지 않고 0 으로 남긴다 —
-- 행이 사라지면 "그 달에 집행 안 함"과 "아직 입력 안 함"이 구분되지 않는다.
INSERT INTO ad_spend (ym, media, amount_manwon, updated_at)
     VALUES (:ym, :media, :amount, CURRENT_TIMESTAMP)
ON CONFLICT (ym, media)
  DO UPDATE SET amount_manwon = EXCLUDED.amount_manwon,
                updated_at    = CURRENT_TIMESTAMP
