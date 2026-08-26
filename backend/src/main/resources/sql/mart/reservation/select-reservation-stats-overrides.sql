-- 특정 product_type(SYSTEM/CATARACT)과 날짜 범위의 셀 수기 보정 이력 전체.
-- 오래된 순으로 정렬 — UI 마커·툴팁이 필드당 최신 값을 인식할 수 있게(같은 필드는 뒤 값이 유효).
SELECT
    TO_CHAR(stat_date, 'YYYY-MM-DD') AS stat_date,
    field_name,
    override_value,
    created_by,
    TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
FROM reservation_stats_override
WHERE product_type = :productType
  AND stat_date BETWEEN CAST(:from AS DATE) AND CAST(:to AS DATE)
ORDER BY stat_date, created_at
