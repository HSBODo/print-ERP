-- ⚠️ 수납액은 MSSQL 에서 money 합계라 '2500000.0000' 처럼 소수가 붙어 온다.
--    BIGINT 로 바로 캐스팅하면 "invalid input syntax for type bigint" 로 배치가 죽는다.
--    NUMERIC 을 거쳐 반올림한 뒤 BIGINT 로 내린다. (writer 가 모든 값을 문자열로 넘기는 구조)
INSERT INTO list_reservation (
    registered_at, registered_time,
    reserve_date, reserve_time,
    chart_no, name, hp, email, reserve_state,
    channel, channel_group,
    doctor, counselor, comment, motive_l, motive_m, motive_m_source, exam_reg_date, exam_stop, surgery_reg_date, surgery_date, surgery_payment, surgery_r, surgery_l,
    loaded_at
) VALUES (
    CAST(NULLIF(:registeredAt, '') AS DATE), :registeredTime,
    :reserveDate, :reserveTime,
    :chartNo, :name, :hp, :email, :reserveState,
    :channel, :channelGroup,
    :doctor, :counselor, :comment, :motiveL, :motiveM, :motiveMSource, :examRegDate, :examStop, :surgeryRegDate, :surgeryDate, COALESCE(ROUND(CAST(NULLIF(:surgeryPayment, '') AS NUMERIC)), 0)::BIGINT, :surgeryR, :surgeryL,
    CURRENT_TIMESTAMP
)
