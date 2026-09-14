-- =========================================================
-- 광고비 (V51a) — (년월, 매체) 단위. 사람이 화면에서 직접 입력.
-- Profile: postgres-mart
--
-- 매체는 광고를 집행하는 '상품' 이지 유입채널이 아니다.
--   naver_reserve  네이버 예약광고  → 채널 '네이버' 에 1:1 대응
--   naver_search   네이버 검색광고  → 유입이 홈페이지·인콜·네이버로 흩어져 귀속 불가
--   modoodoc       모두닥 광고      → 채널 '모두닥' 에 1:1 대응
-- 매체를 코드로 두는 이유 — 나중에 매체가 늘어도 INSERT 한 줄이면 되고,
-- 화면·SQL 어디에도 한글 이름을 박지 않는다.
--
-- ⚠️ amount_manwon 은 **만원 단위 정수**다. 억/원 환산은 화면이 한다.
--    금액을 원 단위로 두면 입력칸이 길어지고 오타 한 자리가 10배 오차가 된다.
-- =========================================================

CREATE TABLE IF NOT EXISTS ad_spend (
    ym            CHAR(7)      NOT NULL,   -- 'YYYY-MM'
    media         VARCHAR(40)  NOT NULL,
    amount_manwon INTEGER      NOT NULL DEFAULT 0,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ym, media)
);
