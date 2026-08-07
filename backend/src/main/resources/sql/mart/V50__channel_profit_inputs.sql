-- =========================================================
-- 채널별 수익성 — 사람이 입력하는 값 2종 (V50)
-- Profile: postgres-mart
--
-- 공헌이익 ROAS 를 만들려면 광고비와 렌즈원가가 필요한데 둘 다 CRM 에 없다.
--   광고비   MARKETING 테이블 0행 (광고 계정은 네이버·모두닥 쪽 외부에 있다)
--   렌즈원가 COSTPRICE·PrcItmLst 는 '환자가 낸 돈'만 담고 매입가 칼럼이 없다.
--            StockHst 448행 → 재고·구매 원가를 이 DB 에서 관리하지 않는다.
--
-- 그래서 드림렌즈 장부(dreamlens_ledger)와 같은 방식으로 **화면에서 직접 입력**받는다.
-- 다만 그쪽은 JPA 엔티티인 반면 여기는 마트 테이블 + JDBC 다 —
-- 조회 경로가 전부 martJdbcTemplate 이고, ddl-auto 가 NOT NULL 컬럼을 못 붙여
-- 503 을 냈던 전례(lens_list_price)를 피하려는 것이다.
--
-- ⚠️ 값은 전부 **만원 단위 정수**다. 억/원 환산은 화면이 한다.
--    금액을 원 단위로 두면 입력칸이 길어지고 오타 한 자리가 10배 오차가 된다.
-- =========================================================

-- 광고비 — (년월, 매체) 단위. 매체는 광고를 집행하는 '상품' 이지 유입채널이 아니다.
--   naver_reserve  네이버 예약광고  → 채널 '네이버' 에 1:1 대응
--   naver_search   네이버 검색광고  → 유입이 홈페이지·인콜·네이버로 흩어져 귀속 불가
--   modoodoc       모두닥 광고      → 채널 '모두닥' 에 1:1 대응
-- 매체를 코드로 두는 이유 — 나중에 매체가 늘어도 INSERT 한 줄이면 되고,
-- 화면·SQL 어디에도 한글 이름을 박지 않는다.
CREATE TABLE IF NOT EXISTS ad_spend (
    ym            CHAR(7)      NOT NULL,   -- 'YYYY-MM'
    media         VARCHAR(40)  NOT NULL,
    amount_manwon INTEGER      NOT NULL DEFAULT 0,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ym, media)
);

-- 렌즈 원가 — 시술유형(op_type)별 **안(眼) 1개당** 매입 단가.
-- 양안이면 2개가 나가므로 사람이 아니라 안 단위여야 한다.
-- op_type 값은 surgery_op_type() 이 내는 코드와 같아야 한다(V47).
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
