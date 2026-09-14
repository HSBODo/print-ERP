-- =========================================================
-- 예약 종합 2026-01~05 골든 고정 (V24)
-- Profile: postgres-mart
--
-- 배경: 2026-01~05 예약 종합(online·call·total) 을 담당자 확정값(월간보고 기준)으로 못 박는다.
--       라이브 SUM(V19/V20 시드 SUM + 홈페이지 마트)이 미세하게 다를 수 있어, 이 5개월은
--       "이 값이 진실" 로 굳혀두고 조회 경로가 마트에서 그대로 읽도록 한다.
--       2026-06 부터는 다시 라이브 SUM 으로 돌아간다(오버라이드 즉시 반영 유지).
--
-- 골든 원천: 담당자 지정 확정값 (2026-07-24)
--   월  | online | call | total
--   ----|--------|------|------
--   01  | 993    | 1432 | 2425
--   02  | 760    | 1132 | 1892
--   03  | 482    |  836 | 1318
--   04  | 493    |  750 | 1243
--   05  | 465    |  688 | 1153
--
-- 재write 차단: ReservationMartJob 이 2026-01~05 를 upsert 대상에서 제외한다
--              (V22 백내장 검사수 골든 패턴과 동일).
--
-- 멱등: MartSchemaInitializer 가 매 기동 시 실행. ON CONFLICT (yr, mo) DO UPDATE 로 확정값 재보정.
--       (기존 배치가 이미 다른 값을 써넣었을 수 있어 DO NOTHING 대신 DO UPDATE).
-- =========================================================

INSERT INTO mart_reservation_overall_monthly (yr, mo, reservations, online, call_count, total) VALUES
    (2026, 1, 2425, 993, 1432, 2425),
    (2026, 2, 1892, 760, 1132, 1892),
    (2026, 3, 1318, 482,  836, 1318),
    (2026, 4, 1243, 493,  750, 1243),
    (2026, 5, 1153, 465,  688, 1153)
ON CONFLICT (yr, mo) DO UPDATE SET
    reservations = EXCLUDED.reservations,
    online       = EXCLUDED.online,
    call_count   = EXCLUDED.call_count,
    total        = EXCLUDED.total,
    loaded_at    = CURRENT_TIMESTAMP;
