-- =========================================================
-- 예약 채널 직원 매핑표 (V43a)
-- Profile: postgres-mart
--
-- 사람 이름으로 등록되는 유입(자사 해외팀 등)의 채널 매핑.
-- v_reservation_channel 뷰(V50 최종 정의)가 이 표를 LEFT JOIN 해서 채널을 결정한다.
--
-- SQL 에 이름을 박지 않는 이유 — 담당자가 바뀌거나 늘 때 배포 없이 INSERT 한 줄로 끝내기 위해서다.
-- 나중에 자사 해외팀 테이블이 생기면 이 표 대신 그쪽을 조인하면 된다.
-- =========================================================

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
