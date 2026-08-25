-- =========================================================
-- 전환·성공률 도메인 마트 (V5) — PR-8
-- Profile: postgres-mart
-- 참고: docs/databatch/strategy.md §5.1, §5.2
--
-- 세 개 테이블:
--   mart_consultation_rate_monthly     — 시력교정/백내장 전환율 월별 (ConsultationRateItem)
--   mart_stop_reason_monthly           — 검사 중단 사유 월별 (StopReasonMonthlyItem)
--   mart_reservation_rate_monthly      — 예약률 월별 (CataractReservationRateItem, category=vision/cataract)
--
-- 계산치(rate)는 소스 서비스가 계산한 값을 그대로 저장(1자리 반올림/ceil 등 로직 포함).
-- 마트 read 시 재계산 없이 반환해 UI 값과 동일 보장.
-- =========================================================

-- ─── 전환율 마트 (consultation-rate) ─────────────────────
-- 원본 서비스: ConsultationRateService.getMonthlyRates(years)
--   시력교정: EXAM 기준 검사→상담→예약→실수술 전환
--   백내장: CUSTOM+RESERVATION 기준 검사→예약→중단
-- 값은 각 원본 sql/consultation/find-monthly-*.sql 집계를 서비스에서 병합·계산한 결과.
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


-- ─── 검사 중단 사유 마트 (stop-reason) ────────────────────
-- 원본 서비스: StopReasonStatsService.getMonthlyStats(years)
--   EXAM.STOP_YN='Y' 건 EXAM_MEMO 키워드 자동 분류 (수술불가/잠정중단 그룹).
--   total = 모든 사유 합 = EXAM.STOP_YN='Y' 월별 건수.
--   빈 달은 0-fill로 저장(서비스 계약 유지).
CREATE TABLE IF NOT EXISTS mart_stop_reason_monthly (
    yr                    SMALLINT    NOT NULL,
    mo                    SMALLINT    NOT NULL,
    recommend_x           INTEGER     NOT NULL DEFAULT 0,
    lens_impossible       INTEGER     NOT NULL DEFAULT 0,
    keratoconus           INTEGER     NOT NULL DEFAULT 0,
    avellino              INTEGER     NOT NULL DEFAULT 0,
    glaucoma              INTEGER     NOT NULL DEFAULT 0,
    vision_change         INTEGER     NOT NULL DEFAULT 0,
    other                 INTEGER     NOT NULL DEFAULT 0,
    total                 INTEGER     NOT NULL DEFAULT 0,
    loaded_at             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- ─── 예약률 마트 (reservation-rate: vision/cataract) ─────
-- 원본 서비스: CataractReservationRateService.getMonthlyRates(years, category)
--   category='vision'   → sql/exam/find-vision-reservation-rate-monthly.sql
--   category='cataract' → sql/exam/find-cataract-reservation-rate-monthly.sql
--   reservationRate = ceil(surgeryBookedCount * 100 / examCount).
-- PK에 category를 포함해 두 카테고리를 동일 테이블에 격리 저장.
CREATE TABLE IF NOT EXISTS mart_reservation_rate_monthly (
    yr                     SMALLINT       NOT NULL,
    mo                     SMALLINT       NOT NULL,
    category               VARCHAR(16)    NOT NULL,           -- 'vision' | 'cataract'
    exam_count             INTEGER        NOT NULL DEFAULT 0,
    surgery_booked_count   INTEGER        NOT NULL DEFAULT 0,
    reservation_rate       NUMERIC(6,1)   NOT NULL DEFAULT 0,
    loaded_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo, category)
);
