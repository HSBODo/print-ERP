-- 장비명이 원천에 대소문자·앞뒤공백이 갈린 채로 들어온다(예: Optomap / optomap).
-- 그대로 GROUP BY 하면 한 장비가 둘로 쪼개지고, 점수표에 없는 쪽은 가중 점수가 1로 떨어진다.
-- 그래서 소문자·trim 한 값을 키로 묶고, 표시 이름은 점수표(checkup_device_score)의 이름을 정본으로 쓴다.
-- 점수표에 없는 장비는 같은 키로 묶인 원천 이름 중 대표값을 쓴다.
WITH device_canon AS (
    SELECT LOWER(LTRIM(RTRIM(checkup_kind_nm))) AS device_key,
           MIN(checkup_kind_nm)                 AS canon_name
    FROM dbo.checkup_device_score
    WHERE NULLIF(LTRIM(RTRIM(checkup_kind_nm)), '') IS NOT NULL
    GROUP BY LOWER(LTRIM(RTRIM(checkup_kind_nm)))
),
checkup AS (
    SELECT CASE
               WHEN NULLIF(LTRIM(RTRIM(operator_nm)), '') IS NULL THEN N'(검사자 미지정)'
               ELSE operator_nm
           END AS operator_name,
           ISNULL(NULLIF(LTRIM(RTRIM(checkup_kind_nm)), ''), N'(미상)') AS device_raw,
           CONVERT(date, record_begin_dt) AS record_date
    FROM dbo.checkup_record
    WHERE record_begin_dt >= :from
      AND record_begin_dt < :toExclusive
      AND LOWER(ISNULL(operator_nm, '')) NOT LIKE '%(kd%'
      AND LOWER(ISNULL(operator_nm, '')) NOT LIKE '%(ls%'
)
SELECT chk.operator_name,
       ISNULL(MIN(canon.canon_name), MIN(chk.device_raw)) AS device_name,
       chk.record_date,
       COUNT_BIG(*) AS checkup_count
FROM checkup AS chk
LEFT JOIN device_canon AS canon
       ON canon.device_key = LOWER(chk.device_raw)
GROUP BY chk.operator_name, LOWER(chk.device_raw), chk.record_date
ORDER BY chk.operator_name, device_name, chk.record_date
