SELECT
    'sheet-' || sheet_row_number                         AS "rowId",
    sheet_row_number                                    AS seq,
    'manual'                                            AS source,
    COALESCE(customer_no, '')                           AS "customerNo",
    ''                                                  AS status,
    COALESCE(inquiry_date, '')                          AS "inquiryDate",
    COALESCE(name, '')                                  AS name,
    CASE WHEN COALESCE(nationality, '') = '배트남' THEN '베트남'
         ELSE COALESCE(nationality, '') END             AS nationality,
    COALESCE(gender, '')                                AS gender,
    COALESCE(dob, '')                                   AS "birthDate",
    COALESCE(contact, '')                               AS contact,
    COALESCE(email, '')                                 AS email,
    COALESCE(ethnicity, '')                             AS ethnicity,
    COALESCE(occupation, '')                            AS occupation,
    COALESCE(contact_lens, '')                          AS "contactLens",
    COALESCE(medical_conditions, '')                    AS "medicalConditions",
    COALESCE(medication_allergy, '')                    AS "medicationAllergy",
    COALESCE(departure_schedule, '')                    AS "departureSchedule",
    COALESCE(exam_date, '')                             AS "examDate",
    COALESCE(surgery_date, '')                          AS "surgeryDate",
    COALESCE(surgery_cost, '')                          AS "surgeryCost",
    ''                                                  AS "examCost",
    ''                                                  AS "operationRight",
    ''                                                  AS "operationLeft",
    ''                                                  AS dreamlens,
    COALESCE(channel, '')                               AS channel,
    ''                                                  AS "channelId",
    COALESCE(online_channel, '')                        AS "onlineChannel",
    ''                                                  AS "agentChannel",
    ''                                                  AS "agentId",
    ''                                                  AS referral,
    COALESCE(remark, '')                                AS remark,
    TO_CHAR(synced_at, 'YYYY-MM-DD')                    AS "registeredDate",
    COALESCE(TO_CHAR(matched_at, 'YYYY-MM-DD'), '')     AS "matchedDate",
    CASE WHEN COALESCE(updated_by, created_by, 'admin') IN ('GoogleSheet_Sync', 'CSV_Load')
         THEN 'admin' ELSE COALESCE(updated_by, created_by, 'admin') END AS "modifiedBy",
    CASE WHEN COALESCE(created_by, 'admin') IN ('GoogleSheet_Sync', 'CSV_Load')
         THEN 'admin' ELSE COALESCE(created_by, 'admin') END             AS "createdBy",
    COALESCE(origin, 'sheet')                           AS origin,
    (COALESCE(origin, 'sheet') = 'sheet' OR locked_at IS NOT NULL) AS locked,
    COALESCE(candidate_customer_no, '')                 AS "candidateCustomerNo",
    -- 검사일이 실제 날짜인데 매칭·후보가 모두 없으면 내원 이력이 있는 셈이라 확인필요로 승격한다.
    CASE WHEN customer_no IS NULL AND candidate_customer_no IS NULL
              AND exam_date ~ '\d{4}-\d{2}-\d{2}'
         THEN '검사일 기록 있음 · CRM 매칭 필요'
         ELSE COALESCE(candidate_reason, '') END        AS "candidateReason",
    COALESCE(matched_by, '')                            AS "matchedBy",
    CASE WHEN customer_no IS NOT NULL THEN 'matched'
         WHEN candidate_customer_no IS NOT NULL THEN 'review'
         WHEN exam_date ~ '\d{4}-\d{2}-\d{2}' THEN 'review'
         ELSE 'received' END                            AS "matchStatus",
    COALESCE(crm_snapshot, '')                          AS "crmSnapshot",
    ''                                                  AS "outpatient1Date",
    ''                                                  AS outpatient1,
    ''                                                  AS "outpatient1Cost",
    ''                                                  AS "outpatient2Date",
    ''                                                  AS outpatient2,
    ''                                                  AS "outpatient2Cost",
    ''                                                  AS "outpatient3Date",
    ''                                                  AS outpatient3,
    ''                                                  AS "outpatient3Cost",
    ''                                                  AS "costSource"
FROM overseas_marketing_sheet
WHERE (
    :dateEnabled = 0
    OR (:dateType = 'reg_date' AND synced_at::date BETWEEN CAST(:from AS date) AND CAST(:to AS date))
    OR (:dateType = 'matched_date' AND matched_at::date BETWEEN CAST(:from AS date) AND CAST(:to AS date))
    OR (:dateType = 'inquiry_date' AND inquiry_date BETWEEN :from AND :to)
    OR (:dateType = 'departure_schedule' AND departure_schedule BETWEEN :from AND :to)
    OR (:dateType = 'exam_date' AND exam_date BETWEEN :from AND :to)
    OR (:dateType = 'surgery_date' AND surgery_date BETWEEN :from AND :to)
)
ORDER BY "inquiryDate" DESC, sheet_row_number DESC
