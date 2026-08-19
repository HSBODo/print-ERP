-- =========================================================
-- 예약자 리스트 — 수술일·수술 수납액 (V49)
-- Profile: postgres-mart
--
-- 채널별 매출·객단가·ROAS 를 내려면 1인당 수술 금액이 있어야 한다.
-- 예약 → 수술까지 이어진 사람의 실제 수납액을 붙인다.
--
-- 원천은 수술자 리스트(find-surgery-list.sql)와 같다 — (고객, 수술일)의 COSTPRICE 합,
-- PayStt='A'(취소분) 제외. 두 화면의 금액이 어긋나지 않게 같은 규칙을 쓴다.
--
-- surgery_date 는 그 수납을 찾은 키다. '이 예약으로 이어진 첫 수술'의 날짜이며,
-- surgery_reg_date(수술예약을 등록한 날)와는 다른 값이다 — 이름이 비슷해 혼동 주의.
--
-- ⚠️ 금액은 숫자로 담는다(문자열 아님). 매출·객단가 집계에 쓰이므로 계산 가능해야 한다.
--    수술자 리스트의 payment 는 화면 표기용이라 콤마가 들어간 문자열이다 — 서로 다른 용도다.
-- ⚠️ 수술등록(수술예약)이 있어도 아직 수술 전이면 0 이다.
--    2026-07: 수술등록 735건 중 수술 완료 574건. 매출 집계 시 0 인 행이 섞이는 게 정상이며,
--    최근 달일수록 그 비중이 크다(아직 수술 전인 사람이 많아서).
-- =========================================================

ALTER TABLE list_reservation ADD COLUMN IF NOT EXISTS surgery_date    VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE list_reservation ADD COLUMN IF NOT EXISTS surgery_payment BIGINT      NOT NULL DEFAULT 0;
