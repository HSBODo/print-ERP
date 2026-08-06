-- =========================================================
-- 예약 채널 분류 뷰 (V40) — list_reservation 위의 파생 규칙
-- Profile: postgres-mart
--
-- 예약통계_채널별 화면이 쓴다. 예약자 리스트와 같은 행을 보므로 합계가 항상 맞는다.
--
-- ★ 채널 판정 우선순위
--   ① 내원동기(중)  — 모두닥·카페·크리에이트립 등 **매체 이름이 직접 적힌** 값
--   ② 직원 설정표   — 자사 해외팀처럼 사람 이름으로 등록되는 유입
--   ③ RESERVE_PATH  — 홈페이지·앱·네이버·인콜·아웃콜
--
--   내원동기가 먼저인 이유 — 모두닥 보고 전화로 예약하면 RESERVE_PATH 는 '인콜' 이다.
--   경로만 보면 모두닥이라는 채널 자체가 안 보인다(2026-01~08 847건이 전부 여기서 나온다).
--
-- ⚠️ 미분류가 나오지 않는다. list_reservation 은 RESERVE_PATH 가
--    CTI·CRM·ONLINE·APP·NAVER 인 행만 담으므로 ③에서 반드시 걸린다.
--    2026-01~08 11,076건 전수 확인함(미분류 0).
--
-- ⚠️ 카카오는 채널에 두지 않는다. RESERVE_PATH 에 KAKAO 가 있지만 예약자 리스트가
--    제외한다(해피톡 소스라 RESERVATION 에 안 들어옴). 칸을 두면 항상 0 이라 오해를 부른다.
-- =========================================================

-- 사람 이름으로 등록되는 유입의 매핑표.
-- SQL 에 이름을 박지 않는 이유 — 담당자가 바뀌거나 늘 때 배포 없이 INSERT 한 줄로 끝내기 위해서다.
-- 나중에 자사 해외팀 테이블이 생기면 이 표 대신 그쪽을 조인하면 된다.
CREATE TABLE IF NOT EXISTS reservation_channel_staff (
    channel   VARCHAR(20)  NOT NULL,
    motive_m  VARCHAR(200) NOT NULL,
    memo      VARCHAR(200) NOT NULL DEFAULT '',
    PRIMARY KEY (channel, motive_m)
);

-- 자사 해외마케팅 담당(2026-08-06 기준). 둘 다 내원동기(대)='소개직원' 으로 등록된다.
-- EMPLOYEE 에 부서 컬럼이 없어 사번으로는 해외팀을 가려낼 수 없다 — 그래서 이름 매핑이다.
INSERT INTO reservation_channel_staff (channel, motive_m, memo) VALUES
    ('자사해외', '연제진',     '자사 해외마케팅 담당'),
    ('자사해외', '김지은(외)', '자사 해외마케팅 담당 (사내 동명이인 구분 접미사 (외))')
ON CONFLICT (channel, motive_m) DO NOTHING;

CREATE OR REPLACE VIEW v_reservation_channel AS
SELECT
    r.registered_at,
    r.chart_no,
    r.name,
    r.reserve_state,
    r.channel        AS reserve_path_channel,   -- 원래 경로(참고용)
    r.motive_m,
    r.exam_reg_date,
    r.exam_stop,
    r.surgery_reg_date,
    COALESCE(
        -- ① 내원동기(중)에 매체명이 직접 적힌 경우
        CASE r.motive_m
            WHEN '모두닥'         THEN '모두닥'
            WHEN '카페'           THEN '카페'
            WHEN '크리에이트립'   THEN '크리에이트립'
            WHEN '에이젼시(외국)' THEN '해외에이전시'
            WHEN '강남언니'       THEN '기타플랫폼'
            WHEN '바비톡'         THEN '기타플랫폼'
            ELSE NULL
        END,
        -- ② 직원 설정표(자사 해외 등)
        st.channel,
        -- ③ 예약 경로
        r.channel
    ) AS channel
  FROM list_reservation r
  LEFT JOIN reservation_channel_staff st ON st.motive_m = r.motive_m;
