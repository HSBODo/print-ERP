-- =========================================================
-- 전환율 마트 (V5a) — consultation-rate
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 원본 서비스: ConsultationRateService.getMonthlyRates(years)
--   시력교정: EXAM 기준 검사→상담→예약→실수술 전환
--   백내장: CUSTOM+RESERVATION 기준 검사→예약→중단
-- 값은 각 원본 sql/softcrm/consultation/select-monthly-*.sql 집계를 서비스에서 병합·계산한 결과.
-- 계산치(rate)는 소스 서비스가 계산한 값을 그대로 저장(1자리 반올림/ceil 등 로직 포함).
-- 마트 read 시 재계산 없이 반환해 UI 값과 동일 보장.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_consultation_rate_monthly (
    yr                             SMALLINT         NOT NULL,
    mo                             SMALLINT         NOT NULL,
    -- 시력교정
    vision_exam_count              INTEGER          NOT NULL DEFAULT 0,
    vision_counsel_count           INTEGER          NOT NULL DEFAULT 0,
    vision_surgery_booked          INTEGER          NOT NULL DEFAULT 0,
    vision_actual_surgery          INTEGER          NOT NULL DEFAULT 0,
    vision_surgery_rate            NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_counsel_rate            NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_counsel_rate_oneday     NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_counsel_rate_general    NUMERIC(6,1)     NOT NULL DEFAULT 0,
    vision_general_book_rate       NUMERIC(6,1)     NOT NULL DEFAULT 0,
    -- 백내장
    cataract_exam_count            INTEGER          NOT NULL DEFAULT 0,
    cataract_surgery_booked        INTEGER          NOT NULL DEFAULT 0,
    cataract_stopped_count         INTEGER          NOT NULL DEFAULT 0,
    cataract_surgery_rate          NUMERIC(6,1)     NOT NULL DEFAULT 0,
    loaded_at                      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);
