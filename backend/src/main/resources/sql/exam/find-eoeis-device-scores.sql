-- 집계 SQL(find-eoeis-checkup-stats.sql)과 같은 규칙으로 장비명을 묶어야
-- 화면의 scores[device] 조회가 빗나가지 않는다. 정본 이름 선택 로직을 동일하게 유지할 것.
SELECT MIN(checkup_kind_nm) AS device_name,
       MAX(score)           AS score
FROM dbo.checkup_device_score
WHERE NULLIF(LTRIM(RTRIM(checkup_kind_nm)), '') IS NOT NULL
GROUP BY LOWER(LTRIM(RTRIM(checkup_kind_nm)))
ORDER BY device_name
