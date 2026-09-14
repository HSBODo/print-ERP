INSERT INTO list_surgery (
    chart_no, name, name_eng,
    surgery_category, surgery_date, exam_date,
    patient_type, surgery_reserve_date, surgery_reg_date, surgery_time,
    surgery_r, surgery_l, recommended_r, recommended_l,
    estimate, surgery_rate, payment,
    surgeon, counselor, doctor, optometrist,
    birth, lunar, phone1, phone2, email,
    zip, addr1, addr2, memo,
    grade, job, last_visit,
    route, section,
    motive_l, motive_m, motive_s, motive_memo,
    exam_memo, insurance, nationality
) VALUES (
    :chartNo, :name, :nameEng,
    :surgeryCategory, CAST(NULLIF(:surgeryDate, '') AS DATE), CAST(NULLIF(:examDate, '') AS DATE),
    :patientType, CAST(NULLIF(:surgeryReserveDate, '') AS DATE), CAST(NULLIF(:surgeryRegDate, '') AS DATE), :surgeryTime,
    :surgeryR, :surgeryL, :recommendedR, :recommendedL,
    :estimate, :surgeryRate, :payment,
    :surgeon, :counselor, :doctor, :optometrist,
    :birth, :lunar, :phone1, :phone2, :email,
    :zip, :addr1, :addr2, :memo,
    :grade, :job, CAST(NULLIF(:lastVisit, '') AS DATE),
    :route, :section,
    :motiveL, :motiveM, :motiveS, :motiveMemo,
    :examMemo, :insurance, :nationality
)
