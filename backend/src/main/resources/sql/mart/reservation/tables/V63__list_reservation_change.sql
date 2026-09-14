-- =========================================================
-- 예약 변경이력 마트 (V63)
-- Profile: postgres-mart
--
-- 원본 SQL: sql/softcrm/reservation/history/select-reservation-change-history.sql
--   검사예약(M/D/H) 전부를 담는다. change_count >= 1 = 예약일이 바뀐 예약(변경 상세 화면), 0 = 미변경(추이 달력의
--   등록 건수·변경률 분모로만 쓴다). 등록 건수는 RESERVE_HISTORY 에 이력이 한 줄이라도 있는 예약 기준.
--   행 1개 = RESERVE_NUM 1개. 변경은 등록 뒤 한참 뒤에도 일어나므로 등록일 범위 delete+insert 가 아니라
--   reserve_num 기준 upsert — 배치는 "이력이 저장된 기간" 으로 후보를 다시 읽어 늦은 변경을 흡수한다.
--
-- change_chain 형식: "YYYY-MM-DD HH:MM@YYYY-MM-DD|…"  (변경시각@그때의 예약일, 최초 예약일부터 순서대로).
--   시각을 못 읽은 이력은 "@YYYY-MM-DD" 로 시각이 빈다. 화면·CSV 가 이 문자열을 풀어 변경1~N 칸을 만든다.
-- reg_source: H = 변경이력 첫 저장 시각 · I = 등록시각(InsertedDateTime) · N = 예약번호 채번일(날짜만).
-- =========================================================

CREATE TABLE IF NOT EXISTS list_reservation_change (
    reserve_num       VARCHAR(30)   PRIMARY KEY,
    registered_at     DATE          NOT NULL,                    -- 등록일 (3순위 산정 결과)
    registered_time   VARCHAR(10)   NOT NULL DEFAULT '',         -- 등록시각 HH:MM ('' = 채번일만 아는 건)
    reg_source        VARCHAR(2)    NOT NULL DEFAULT '',         -- H / I / N
    chart_no          VARCHAR(50)   NOT NULL DEFAULT '',
    name              VARCHAR(100)  NOT NULL DEFAULT '',
    branch            VARCHAR(4)    NOT NULL DEFAULT '',         -- M 시력교정 / D 드림렌즈 / H 백내장
    reserve_state     VARCHAR(4)    NOT NULL DEFAULT '',         -- Y/I/H/C (현재 상태)
    first_date        VARCHAR(20)   NOT NULL DEFAULT '',         -- 최초 예약일
    final_date        VARCHAR(20)   NOT NULL DEFAULT '',         -- 최종(현재) 예약일 = RESERVATION.RESERVE_DATE
    change_count      INT           NOT NULL DEFAULT 0,          -- 전체 변경 횟수 (체인 길이 - 1) · 0 = 미변경
    change_chain      TEXT          NOT NULL DEFAULT '',
    last_changed_at   VARCHAR(20)   NOT NULL DEFAULT '',         -- 마지막 변경 시각 (관측·정렬용 · API 노출 X)
    -- 감사 컬럼 2종 (loaded_at 은 UPSERT 마다 갱신, first_loaded_at 은 최초 INSERT 시점 보존)
    first_loaded_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 이 예약이 처음 마트에 적재된 시점 (감사·디버깅용)
    loaded_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP   -- 최종 upsert 시점
);

-- 기존 V63 배포된 DB 호환 — first_loaded_at 소급 추가 (2026-09-11).
-- Postgres ADD COLUMN IF NOT EXISTS 는 idempotent, 신규 DB 는 no-op.
ALTER TABLE list_reservation_change ADD COLUMN IF NOT EXISTS first_loaded_at TIMESTAMP;
-- 기존 행 소급: loaded_at 을 최초 적재 시점으로 간주(정확한 값은 없어도 감사 시 참조 가능).
UPDATE list_reservation_change SET first_loaded_at = loaded_at WHERE first_loaded_at IS NULL;
-- 이후 신규 INSERT 는 DEFAULT 로 자동 채워지지만 소급 컬럼은 NULL 허용 상태 → NOT NULL 승격.
ALTER TABLE list_reservation_change ALTER COLUMN first_loaded_at SET NOT NULL;
ALTER TABLE list_reservation_change ALTER COLUMN first_loaded_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_list_reservation_change_registered
    ON list_reservation_change (registered_at);

CREATE INDEX IF NOT EXISTS idx_list_reservation_change_chart
    ON list_reservation_change (chart_no);

-- 추이 달력 '예약일 기준' 집계용 (final_date 는 YYYY-MM-DD 문자열)
CREATE INDEX IF NOT EXISTS idx_list_reservation_change_final
    ON list_reservation_change (final_date);

-- 추이 달력 일별 집계 최적화 (2026-09-11 추가) — GROUP BY (axis, branch) 커버 인덱스.
-- Postgres 는 composite index 첫 컬럼만으로도 range scan 가능해 위 single 인덱스와 공존해도 손해 없음.
-- 데이터 규모(수만 행) 에서는 유의미하지 않지만 성장 시 index-only scan 가능.
CREATE INDEX IF NOT EXISTS idx_list_reservation_change_registered_branch
    ON list_reservation_change (registered_at, branch);

CREATE INDEX IF NOT EXISTS idx_list_reservation_change_final_branch
    ON list_reservation_change (final_date, branch);
