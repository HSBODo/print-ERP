-- =========================================================
-- 예약 종합(콜·온라인) 도메인 마트 (V12)
-- Profile: postgres-mart
--
-- 한 개 테이블:
--   mart_reservation_overall_monthly — 월별 예약 종합 (ReservationOverallMonthlyItem)
--
-- 원본 서비스: ReservationOverallStatsService.getMonthlyStats(years)
--   - 2024·2025: 레거시 BCRM 문의통계(RSS) 확정값 (이 파일에 seed)
--   - 2026~   : 배치가 MSSQL 라이브값을 upsert (min-year 가드 = 2026)
--
-- 컬럼:
--   reservations = 예약 종합(콜 + 온라인). 카카오(해피톡)는 종합 미포함(원본 정의).
--   online       = 홈페이지/앱 + 네이버
--   call_count   = 인콜(CTI) + 아웃콜(CRM)
--   total        = reservations 와 동일 (DTO 계약)
--
-- ⚠️ 컬럼명 주의: SQL 예약어(call) 회피 위해 call_count 사용. SELECT 시 "call" alias.
--
-- 24·25 seed 는 ReservationOverallStatsService 에 있던 LEGACY_* 상수를 그대로 이관한 값이다.
-- 이후 서비스에서 상수는 제거되며, 이 파일이 24·25 확정값의 유일 원천(SSOT)이다.
-- =========================================================

CREATE TABLE IF NOT EXISTS mart_reservation_overall_monthly (
    yr           SMALLINT    NOT NULL,
    mo           SMALLINT    NOT NULL,
    reservations INTEGER     NULL,
    online       INTEGER     NULL,
    call_count   INTEGER     NULL,
    total        INTEGER     NULL,
    loaded_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (yr, mo)
);


-- ─── 2024·2025 seed (LEGACY_* 이관) ───────────────────────
INSERT INTO mart_reservation_overall_monthly (yr, mo, reservations, online, call_count, total) VALUES
    -- 2024 (reservations, online, call)
    (2024,  1, 2799, 1466, 1333, 2799),
    (2024,  2, 1651,  943,  708, 1651),
    (2024,  3, 1174,  707,  467, 1174),
    (2024,  4, 1092,  599,  493, 1092),
    (2024,  5, 1264,  575,  689, 1264),
    (2024,  6, 1317,  578,  739, 1317),
    (2024,  7, 1569,  716,  853, 1569),
    (2024,  8, 1641,  879,  762, 1641),
    (2024,  9, 1206,  672,  534, 1206),
    (2024, 10, 1231,  662,  569, 1231),
    (2024, 11, 1967, 1001,  966, 1967),
    (2024, 12, 2589, 1292, 1297, 2589),
    -- 2025
    (2025,  1, 2759, 1334, 1425, 2759),
    (2025,  2, 1945,  878, 1067, 1945),
    (2025,  3, 1204,  548,  656, 1204),
    (2025,  4, 1357,  583,  774, 1357),
    (2025,  5, 1219,  501,  718, 1219),
    (2025,  6, 1318,  529,  789, 1318),
    (2025,  7, 1581,  608,  973, 1581),
    (2025,  8, 1315,  551,  764, 1315),
    (2025,  9, 1645,  791,  854, 1645),
    (2025, 10, 1031,  477,  554, 1031),
    (2025, 11, 1473,  573,  900, 1473),
    (2025, 12, 2209,  975, 1234, 2209)
ON CONFLICT (yr, mo) DO NOTHING;
