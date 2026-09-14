-- 예약 채널 × 실제 수술 유형 — v_reservation_channel 에서 뽑는다.
--
-- 수술명(surgery_r/surgery_l)은 OPERATIONDATA·Cataract_Operationdata 원천이라
-- **실제로 한 수술**이다. 그래서 이 집계는 추정이 아니다.
--
-- 눈별로 펼쳐서 센다 — 한 사람이 좌우에 다른 시술을 받으면 두 유형 모두에 잡힌다.
-- 다만 같은 유형이 양안이면 1 명이다(COUNT DISTINCT person).
-- 수술 통계의 "PIOL 이 아닌 유형은 받은 항목마다 센다" 규칙과 같은 방식이다.
--
-- ⚠️ 수술등록(수술예약)이 있어도 수술명이 없는 건이 있다 — 아직 수술 전이라서다.
--    2026-07: 수술등록 735건 중 수술명 574건. 유형별 합계 < 수술등록 인원이 정상이다.
--    화면은 "수술 완료 N명 기준" 이라고 밝힌다.
--
-- channel = NULL 인 행을 함께 낸다(GROUPING SETS) — 전체 기준 값이다.
-- 채널별 사람수를 더하면 한 사람이 두 채널에 걸릴 때 중복되므로 전체는 따로 세야 한다.
WITH eyes AS (
    SELECT channel, person, op_type_r AS op_type
      FROM v_reservation_channel
     WHERE registered_at >= CAST(:from AS DATE)
       AND registered_at <= CAST(:to   AS DATE)
       AND op_type_r IS NOT NULL
    UNION ALL
    SELECT channel, person, op_type_l
      FROM v_reservation_channel
     WHERE registered_at >= CAST(:from AS DATE)
       AND registered_at <= CAST(:to   AS DATE)
       AND op_type_l IS NOT NULL
)
SELECT
    channel,
    op_type,
    COUNT(DISTINCT person) AS persons
  FROM eyes
 GROUP BY GROUPING SETS ((channel, op_type), (op_type))
 ORDER BY persons DESC
