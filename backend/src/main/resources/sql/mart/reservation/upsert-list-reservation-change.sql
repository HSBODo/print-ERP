INSERT INTO list_reservation_change (
    reserve_num, registered_at, registered_time, reg_source,
    chart_no, name, branch, reserve_state,
    first_date, final_date, change_count, change_chain, last_changed_at,
    first_loaded_at, loaded_at
) VALUES (
    :reserveNum, CAST(:registeredAt AS DATE), :registeredTime, :regSource,
    :chartNo, :name, :branch, :reserveState,
    :firstDate, :finalDate, :changeCount, :changeChain, :lastChangedAt,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (reserve_num) DO UPDATE SET
    registered_at   = EXCLUDED.registered_at,
    registered_time = EXCLUDED.registered_time,
    reg_source      = EXCLUDED.reg_source,
    chart_no        = EXCLUDED.chart_no,
    name            = EXCLUDED.name,
    branch          = EXCLUDED.branch,
    reserve_state   = EXCLUDED.reserve_state,
    first_date      = EXCLUDED.first_date,
    final_date      = EXCLUDED.final_date,
    change_count    = EXCLUDED.change_count,
    change_chain    = EXCLUDED.change_chain,
    last_changed_at = EXCLUDED.last_changed_at,
    loaded_at       = CURRENT_TIMESTAMP
    -- first_loaded_at 은 의도적으로 UPDATE 에서 제외 — 최초 적재 시점 보존 (감사·디버깅).
    -- ON CONFLICT DO UPDATE 는 SET 절에 없는 컬럼을 건드리지 않아 원본 값이 그대로 남는다.
