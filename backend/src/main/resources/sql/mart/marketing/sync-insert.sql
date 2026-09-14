INSERT INTO overseas_marketing_sheet (
    sheet_row_number, inquiry_date, name, contact, email, gender, dob, nationality, ethnicity,
    occupation, contact_lens, medical_conditions, medication_allergy,
    departure_schedule, exam_date, surgery_date, surgery_cost,
    channel, online_channel, remark, synced_at, origin, created_by
) VALUES (
    :sheetRowNumber, :inquiryDate, :name, :contact, :email, :gender, :dob, :nationality, :ethnicity,
    :occupation, :contactLens, :medicalConditions, :medicationAllergy,
    :departureSchedule, :examDate, :surgeryDate, :surgeryCost,
    :channel, :onlineChannel, :remark, CURRENT_TIMESTAMP, 'sheet', 'GoogleSheet_Sync'
)
ON CONFLICT (sheet_row_number) DO NOTHING
