-- =========================================================
-- 예약 월별 집계 마트 (V3a) — ReservationMonthlyItem
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 원본 SQL: sql/softcrm/reservation/select-monthly-by-type.sql
--   surgery    = RESERVE_FLAG='O'
--   outpatient = RESERVE_JINRYO='2'
--   dreamlens  = RESERVE_FLAG='D'
-- 공통 필터: RESERVE_STATE <> 'C'
--
-- 이력: mart_reservation_kakao_daily 는 예약자 리스트 kakaoCount 참고용으로 만들었으나
--       프론트 렌더링이 실제로 없어 dead consumer 로 확인됨(2026-08-19 폐지). 소비자·적재
--       배치·SQL 리소스와 함께 CREATE 문도 제거 — 재기동 시 재생성 방지. 기존 배포된 DB 에서는
--       수동 DROP 필요.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_reservation_monthly (
    yr          SMALLINT    NOT NULL,
    mo          SMALLINT    NOT NULL,
    surgery     INTEGER     NOT NULL DEFAULT 0,
    outpatient  INTEGER     NOT NULL DEFAULT 0,
    dreamlens   INTEGER     NOT NULL DEFAULT 0,
    total       INTEGER     NOT NULL DEFAULT 0,
    loaded_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
