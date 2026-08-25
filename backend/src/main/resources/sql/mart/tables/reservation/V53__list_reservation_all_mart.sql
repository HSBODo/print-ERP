-- =========================================================
-- 예약 전체 리스트 마트 (V53) — 얇은 집계 전용
-- Profile: postgres-mart
--
-- 하나의 테이블:
--   list_reservation_all — RESERVATION 전체 예약(수술/외래/드림렌즈) 행.
--   원본 SQL: sql/reservation-list/reservation-list-all.sql
--   예약일(RESERVE_DATE) 기준. 행 1개 = RESERVATION 1건. delete+insert 패턴.
--   리스트 합계 = 월별 예약 건수(mart_reservation_monthly)와 정합.
--
-- 왜 별도 리스트인가.
--   기존 list_reservation(V3) 은 RESERVE_FLAG='M'(검사 예약) 전용이라
--   예약 건수 지표(수술 O · 외래 JINRYO='2' · 드림렌즈 D)를 담지 않는다.
--   화면·다른 지표는 검사 예약만 다뤄 그대로 유지하고,
--   이 리스트는 **배치·집계 전용**으로 얇게(3필드 + 날짜) 만든다.
--
-- 담는 컬럼.
--   집계 정의(플래그·진료구분·상태) + JOIN 키(chart_no·reserve_num).
--   chart_no 는 list_exam·list_surgery 와 JOIN 해 예약률·상담성공률(Phase 2) 을 계산한다 —
--   그래서 사람 식별 필드는 없지만 JOIN 키 두 개는 처음부터 담아 둔다(V4 때 examStop 자리를 잡아둔 것과 같은 이유).
-- =========================================================

CREATE TABLE IF NOT EXISTS list_reservation_all (
    id              BIGSERIAL     PRIMARY KEY,
    reserve_date    DATE          NOT NULL,                    -- 예약일 (RESERVE_DATE)
    reserve_flag    VARCHAR(4)    NOT NULL DEFAULT '',         -- O(수술) / D(드림렌즈) / F(외래) / M(검사) 등
    reserve_jinryo VARCHAR(4)    NOT NULL DEFAULT '',          -- 진료구분 — '2'=외래
    reserve_state   VARCHAR(4)    NOT NULL DEFAULT '',         -- Y/I/H/C 등 (C=취소)
    chart_no        VARCHAR(50)   NOT NULL DEFAULT '',         -- CUST_NUM — list_exam·list_surgery 와 JOIN 키
    reserve_num     VARCHAR(30)   NOT NULL DEFAULT '',         -- RESERVE_NUM — 예약 식별(중복 판정용)
    loaded_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_list_reservation_all_reserve_date
    ON list_reservation_all (reserve_date);

-- chart_no 인덱스 — list_exam·list_surgery 와 JOIN 성능. 카디널리티가 커도 EXISTS 형태로 자주 쓴다.
CREATE INDEX IF NOT EXISTS idx_list_reservation_all_chart
    ON list_reservation_all (chart_no);
