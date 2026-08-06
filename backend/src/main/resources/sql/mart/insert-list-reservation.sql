INSERT INTO list_reservation (
    registered_at, registered_time,
    reserve_date, reserve_time,
    chart_no, name, hp, email, reserve_state,
    channel, channel_group,
    doctor, counselor, comment, motive_l, motive_m, motive_m_source, exam_reg_date, exam_stop, surgery_reg_date, surgery_r, surgery_l,
    loaded_at
) VALUES (
    CAST(NULLIF(:registeredAt, '') AS DATE), :registeredTime,
    :reserveDate, :reserveTime,
    :chartNo, :name, :hp, :email, :reserveState,
    :channel, :channelGroup,
    :doctor, :counselor, :comment, :motiveL, :motiveM, :motiveMSource, :examRegDate, :examStop, :surgeryRegDate, :surgeryR, :surgeryL,
    CURRENT_TIMESTAMP
)
