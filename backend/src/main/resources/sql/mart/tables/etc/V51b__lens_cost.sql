-- =========================================================
-- 렌즈 원가 (V51b) — 시술유형(op_type)별 **안(眼) 1개당** 매입 단가.
-- Profile: postgres-mart
--
-- 양안이면 2개가 나가므로 사람이 아니라 안 단위여야 한다.
-- op_type 값은 surgery_op_type() 이 내는 코드와 같아야 한다(V47).
--
-- ⚠️ unit_cost_manwon 은 **만원 단위 정수**. 억/원 환산은 화면이 한다.
--    조회 경로가 전부 martJdbcTemplate 이고, ddl-auto 가 NOT NULL 컬럼을 못 붙여
--    503 을 냈던 전례(lens_list_price)를 피하려는 것이다.
-- =========================================================

CREATE TABLE IF NOT EXISTS lens_cost (
    op_type          VARCHAR(40) PRIMARY KEY,
    unit_cost_manwon INTEGER     NOT NULL DEFAULT 0,
    updated_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 렌즈가 들어가는 유형만 미리 넣어 둔다(단가 0 = 미입력).
-- 행이 있어야 화면이 "무엇을 채워야 하는지" 목록으로 보여줄 수 있다.
-- 레이저 계열(smile·smilePro·lasek 등)은 렌즈가 없으므로 넣지 않는다.
INSERT INTO lens_cost (op_type, unit_cost_manwon) VALUES
    ('icl',   0),   -- EVO/EVOp ICL
    ('tIcl',  0),   -- 난시교정 T-ICL (단가가 다르다)
    ('kpl',   0),
    ('tKpl',  0),
    ('viva',  0)
ON CONFLICT (op_type) DO NOTHING;
