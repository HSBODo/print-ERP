-- 화면에서 직접 추가한 접수 행. PK 는 전용 시퀀스(1,000,000+)로 발급해 시트 행번호와 분리한다.
INSERT INTO overseas_marketing_sheet (
    sheet_row_number, inquiry_date, name, contact, email, gender, dob, nationality, ethnicity,
    occupation, contact_lens, medical_conditions, medication_allergy,
    departure_schedule, exam_date, surgery_date, surgery_cost,
    channel, online_channel, remark, synced_at, origin, created_by
) VALUES (
    nextval('overseas_marketing_manual_seq'), :inquiryDate, :name, :contact, :email, :gender, :dob, :nationality, :ethnicity,
    :occupation, :contactLens, :medicalConditions, :medicationAllergy,
    :departureSchedule, :examDate, :surgeryDate, :surgeryCost,
    :channel, :onlineChannel, :remark, CURRENT_TIMESTAMP, 'manual', :createdBy
)
RETURNING sheet_row_number
