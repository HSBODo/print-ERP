-- 파라미터는 소스 SELECT(mariadb/reservation-list-homepage.sql) 의 camelCase 별칭과 1:1 매칭.
-- Writer 가 원본 Map<String,Object> 에서 그대로 꺼내 넣는다.
INSERT INTO mart_list_reservation_homepage (
    legacy_no, device_type,
    name, phone,
    reserve_date, reserve_time,
    utm_source, utm_medium, utm_campaign,
    referral_code,
    exam_type, surgery_tf, is_reserve,
    reg_date, loaded_at
) VALUES (
    :legacyNo, :deviceType,
    :name, :phone,
    :reserveDate, :reserveTime,
    :utmSource, :utmMedium, :utmCampaign,
    :referralCode,
    :examType, :surgeryTf, :isReserve,
    CAST(NULLIF(:regDate, '') AS TIMESTAMP), CURRENT_TIMESTAMP
)
