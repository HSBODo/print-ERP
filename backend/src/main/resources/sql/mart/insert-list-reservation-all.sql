INSERT INTO list_reservation_all (
    reserve_date, reserve_flag, reserve_jinryo, reserve_state,
    chart_no, reserve_num,
    loaded_at
) VALUES (
    CAST(:reserveDate AS DATE), :reserveFlag, :reserveJinryo, :reserveState,
    :chartNo, :reserveNum,
    CURRENT_TIMESTAMP
)
