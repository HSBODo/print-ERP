-- 채널별 렌즈 원가 — v_reservation_channel 의 실제 수술명을 **안 단위**로 펼쳐 단가표와 잇는다.
--
-- 왜 안 단위인가. 렌즈는 눈 하나에 하나씩 들어간다. 양안 수술이면 2개가 나간다.
-- op-types 화면은 COUNT(DISTINCT person) 이라 양안이 1 로 접히는데, 원가는 그러면 절반이 된다.
--
-- 단가가 없는(0 이거나 표에 없는) 유형은 lens_eyes_priced 에서 빠지고 lens_eyes_unpriced 로 센다.
-- 화면은 unpriced 가 남아 있으면 "렌즈원가 미완성"으로 표시해야 한다 —
-- 0 을 원가로 쓰면 공헌이익이 실제보다 커 보이고, 그게 광고 예산 결정으로 이어진다.
--
-- ⚠️ 레이저 계열은 애초에 lens_cost 에 행이 없다. 그건 미입력이 아니라 렌즈가 없는 것이라
--    unpriced 에 들어가면 안 된다 — 그래서 IS NOT NULL(표에 존재) 조건으로 먼저 거른다.
WITH eyes AS (
    SELECT channel, op_type_r AS op_type
      FROM v_reservation_channel
     WHERE registered_at >= CAST(:from AS DATE)
       AND registered_at <= CAST(:to   AS DATE)
       AND op_type_r IS NOT NULL
    UNION ALL
    SELECT channel, op_type_l
      FROM v_reservation_channel
     WHERE registered_at >= CAST(:from AS DATE)
       AND registered_at <= CAST(:to   AS DATE)
       AND op_type_l IS NOT NULL
), lens_eyes AS (
    -- lens_cost 에 행이 있는 유형만 = 렌즈가 들어가는 수술
    SELECT e.channel, e.op_type, lc.unit_cost_manwon
      FROM eyes e
      JOIN lens_cost lc ON lc.op_type = e.op_type
)
SELECT
    channel,
    COUNT(*)                                                    AS lens_eyes,
    COUNT(*) FILTER (WHERE unit_cost_manwon > 0)                AS lens_eyes_priced,
    COUNT(*) FILTER (WHERE unit_cost_manwon <= 0)               AS lens_eyes_unpriced,
    COALESCE(SUM(unit_cost_manwon), 0)                          AS lens_cost_manwon
  FROM lens_eyes
 GROUP BY channel
