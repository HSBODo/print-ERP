INSERT INTO list_reservation (
    registered_at, registered_time,
    reserve_date, reserve_time,
    chart_no, name, reserve_state,
    channel, channel_group,
    doctor, counselor, comment, motive_m,
    loaded_at
) VALUES (
    CAST(NULLIF(:registeredAt, '') AS DATE), :registeredTime,
    :reserveDate, :reserveTime,
    :chartNo, :name, :reserveState,
    :channel, :channelGroup,
    :doctor, :counselor, :comment, :motiveM,
    CURRENT_TIMESTAMP
)
