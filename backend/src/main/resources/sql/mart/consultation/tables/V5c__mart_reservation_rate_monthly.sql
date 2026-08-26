-- =========================================================
-- 예약률 마트 (V5c) — reservation-rate: vision/cataract
-- Profile: postgres-mart
--
-- 원본 서비스: CataractReservationRateService.getMonthlyRates(years, category)
--   category='vision'   → sql/softcrm/exam/select-vision-reservation-rate-monthly.sql
--   category='cataract' → sql/softcrm/exam/select-cataract-reservation-rate-monthly.sql
--   reservationRate = ceil(surgeryBookedCount * 100 / examCount).
-- PK에 category를 포함해 두 카테고리를 동일 테이블에 격리 저장.
-- =========================================================

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
