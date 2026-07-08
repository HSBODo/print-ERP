INSERT INTO mart_reservation_kakao_daily (
    dt, kakao_count, loaded_at
) VALUES (
    :dt, :kakaoCount, CURRENT_TIMESTAMP
)
ON CONFLICT (dt) DO UPDATE SET
    kakao_count = EXCLUDED.kakao_count,
    loaded_at   = CURRENT_TIMESTAMP
