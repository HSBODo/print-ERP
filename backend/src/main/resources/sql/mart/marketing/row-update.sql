-- 수정은 시트 원본 컬럼에 한정한다. CRM 파생값(고객번호·상태·비용)은 조회 시 재계산되므로 제외.
UPDATE overseas_marketing_sheet SET
    inquiry_date       = :inquiryDate,
    name               = :name,
    contact            = :contact,
    email              = :email,
    gender             = :gender,
    dob                = :dob,
    nationality        = :nationality,
    ethnicity          = :ethnicity,
    occupation         = :occupation,
    contact_lens       = :contactLens,
    medical_conditions = :medicalConditions,
    medication_allergy = :medicationAllergy,
    departure_schedule = :departureSchedule,
    exam_date          = :examDate,
    surgery_date       = :surgeryDate,
    surgery_cost       = :surgeryCost,
    channel            = :channel,
    online_channel     = :onlineChannel,
    remark             = :remark,
    updated_by         = :updatedBy,
    updated_at         = CURRENT_TIMESTAMP,
    -- 이름·생년월일이 바뀌었을 수 있으므로 자동 매칭·스냅샷을 지워 다음 동기화에서 재계산한다.
    -- 단, 담당자가 직접 확정한 수동 매칭(matched_by가 사용자 ID)은 보존한다.
    customer_no        = CASE WHEN COALESCE(matched_by, 'CRM_Sync') <> 'CRM_Sync' THEN customer_no ELSE NULL END,
    matched_at         = CASE WHEN COALESCE(matched_by, 'CRM_Sync') <> 'CRM_Sync' THEN matched_at  ELSE NULL END,
    matched_by         = CASE WHEN COALESCE(matched_by, 'CRM_Sync') <> 'CRM_Sync' THEN matched_by  ELSE NULL END,
    crm_snapshot       = CASE WHEN COALESCE(matched_by, 'CRM_Sync') <> 'CRM_Sync' THEN crm_snapshot     ELSE NULL END,
    crm_refreshed_at   = CASE WHEN COALESCE(matched_by, 'CRM_Sync') <> 'CRM_Sync' THEN crm_refreshed_at ELSE NULL END,
    candidate_customer_no = NULL,
    candidate_reason      = NULL
WHERE sheet_row_number = :rowNumber
