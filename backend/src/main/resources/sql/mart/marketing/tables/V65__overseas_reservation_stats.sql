-- 해외마케팅 예약통계: 레거시 시트 시드(~2026-08-23) + 담당자 수동 수정값 저장.
-- 2026-08-24 이후 값은 조회 시 접수리스트에서 자동 집계하며, 이 테이블의 행이 있으면 그 값이 우선한다.
CREATE TABLE IF NOT EXISTS overseas_reservation_stats (
    stat_date   DATE         NOT NULL,
    group_key   VARCHAR(20)  NOT NULL,  -- total | anglo | china | vietnam | mongolia | agency
    metric_key  VARCHAR(40)  NOT NULL,  -- inq | rsv | exam | surgery | outpatient | <channel>_inq | <channel>_rsv
    value       INTEGER      NOT NULL DEFAULT 0,
    source      VARCHAR(10)  NOT NULL DEFAULT 'seed',  -- seed | manual
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP,
    PRIMARY KEY (stat_date, group_key, metric_key)
);
