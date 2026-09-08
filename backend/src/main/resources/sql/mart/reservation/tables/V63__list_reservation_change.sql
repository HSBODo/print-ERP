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
    last_changed_at   VARCHAR(20)   NOT NULL DEFAULT '',         -- 마지막 변경 시각 (관측·정렬용)
    loaded_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_reservation_change_registered
    ON list_reservation_change (registered_at);

CREATE INDEX IF NOT EXISTS idx_list_reservation_change_chart
    ON list_reservation_change (chart_no);

-- 추이 달력 '예약일 기준' 집계용 (final_date 는 YYYY-MM-DD 문자열)
CREATE INDEX IF NOT EXISTS idx_list_reservation_change_final
    ON list_reservation_change (final_date);
