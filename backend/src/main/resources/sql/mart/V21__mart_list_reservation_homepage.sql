-- =========================================================
-- 예약자 리스트_홈페이지 마트 (V21)
-- Profile: postgres-mart
-- 참고: docs/databatch/legacy-homepage-source-strategy.md §3
--
-- 소스: 레거시 홈페이지 MariaDB `bseyecom_db.TBL_COUNSEL`
--       (CATEGORY='COUNSELONLINE' 온라인 예약 채널)
-- 배치: ReservationListHomepageMartJob — 등록일(REG_DATE) 기준 범위 delete + insert
-- 앱  : ReservationListHomepageMartQueryService(@Primary postgres-mart) 가 이 표를 읽는다.
--       배치 노드가 아닌 앱에서 MariaDB 로 매 요청 붙는 구조를 없앤다(strategy §3-2).
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_list_reservation_homepage (
    id              BIGSERIAL     PRIMARY KEY,
    legacy_no       VARCHAR(20)   NOT NULL,                      -- 원본 C_NO(int) → 문자열. 프론트 zod z.string() 계약.
    device_type     VARCHAR(32)   NOT NULL DEFAULT '',           -- 원본 DIVICE_TYPE — 오타 그대로 굳어 있음.
    name            VARCHAR(100)  NOT NULL DEFAULT '',
    phone           VARCHAR(32)   NOT NULL DEFAULT '',
    reserve_date    VARCHAR(16)   NOT NULL DEFAULT '',           -- 예약 희망일(원본 문자열 유지)
    reserve_time    VARCHAR(16)   NOT NULL DEFAULT '',
    utm_source      VARCHAR(64)   NOT NULL DEFAULT '',
    utm_medium      VARCHAR(64)   NOT NULL DEFAULT '',
    utm_campaign    VARCHAR(128)  NOT NULL DEFAULT '',
    referral_code   VARCHAR(32)   NOT NULL DEFAULT '',
    exam_type       VARCHAR(8)    NOT NULL DEFAULT '',           -- 5=시력교정, 2=백내장, 21=노안, 24/25=렌즈
    surgery_tf      VARCHAR(2)    NOT NULL DEFAULT '',
    is_reserve      VARCHAR(8)    NOT NULL DEFAULT '',
    reg_date        TIMESTAMP     NOT NULL,                      -- 등록일시. 배치 delete/insert 의 기준축.
    loaded_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mart_list_reservation_homepage_reg_date
    ON mart_list_reservation_homepage (reg_date);

-- 월별 중복제외(phone) 집계는 exam_type='5' + reg_date 로 스캔한다.
CREATE INDEX IF NOT EXISTS idx_mart_list_reservation_homepage_exam_type_reg
    ON mart_list_reservation_homepage (exam_type, reg_date);
