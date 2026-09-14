-- 예약통계 자동 집계 원천: 접수리스트 전 행(분류·날짜 해석은 서비스에서 수행).
SELECT
    COALESCE(inquiry_date, '')   AS "inquiryDate",
    COALESCE(exam_date, '')      AS "examDate",
    COALESCE(surgery_date, '')   AS "surgeryDate",
    COALESCE(nationality, '')    AS nationality,
    COALESCE(channel, '')        AS channel,
    COALESCE(online_channel, '') AS "onlineChannel",
    COALESCE(crm_snapshot, '')   AS "crmSnapshot"
FROM overseas_marketing_sheet
