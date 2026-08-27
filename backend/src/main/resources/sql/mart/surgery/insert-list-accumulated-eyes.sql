-- =========================================================
-- 누적 안수 리스트 마트 — insert (재적재 두번째 단계).
--
-- Writer 가 소스 SELECT 별칭(camelCase) 을 그대로 :바인딩 파라미터로 넘긴다.
--   → :id, :custNum, ... :isActive
-- 빈 문자열이 섞여 들어와도 CAST 실패하지 않도록 NULLIF 로 방어.
-- =========================================================

INSERT INTO list_accumulated_eyes (
    id, cust_num, custom_name, custom_phone,
    operation_category, operation_code,
    operation_date, accumulated_eye_count, eye_position,
    create_date, last_modified_date, is_active
) VALUES (
    :id,
    CAST(NULLIF(:custNum, '') AS BIGINT),
    :customName,
    :customPhone,
    :operationCategory,
    :operationCode,
    CAST(NULLIF(:operationDate, '') AS DATE),
    CAST(NULLIF(:accumulatedEyeCount, '') AS BIGINT),
    :eyePosition,
    CAST(NULLIF(:createDate, '') AS TIMESTAMP),
    CAST(NULLIF(:lastModifiedDate, '') AS TIMESTAMP),
    CAST(NULLIF(:isActive, '') AS BOOLEAN)
)
