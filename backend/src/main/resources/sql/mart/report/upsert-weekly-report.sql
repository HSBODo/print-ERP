INSERT INTO mart_weekly_report (
    yr, wk, start_date, end_date,
    reservations, call_cnt, online,
    intro_general, intro_customer, intro_staff,
    job_office, job_student, job_etc,
    exam_total, vision_exam, cataract_exam, one_day,
    vision_booked, cataract_booked, one_day_booked,
    stop_count, exam_general_base, booked_general,
    vision_surgery, cataract_surgery, total_surgery,
    reoperation, reop_laser, reop_lens,
    outpatient,
    loaded_at
) VALUES (
    :yr, :wk, CAST(:startDate AS DATE), CAST(:endDate AS DATE),
    :reservations, :call, :online,
    :introGeneral, :introCustomer, :introStaff,
    :jobOffice, :jobStudent, :jobEtc,
    :examTotal, :visionExam, :cataractExam, :oneDay,
    :visionBooked, :cataractBooked, :oneDayBooked,
    :stopCount, :examGeneralBase, :bookedGeneral,
    :visionSurgery, :cataractSurgery, :totalSurgery,
    :reoperation, :reopLaser, :reopLens,
    :outpatient,
    CURRENT_TIMESTAMP
)
ON CONFLICT (yr, wk) DO UPDATE SET
    start_date         = EXCLUDED.start_date,
    end_date           = EXCLUDED.end_date,
    -- 예약 종합·콜·온라인 3컬럼은 컷오버(2026-06) 이전 구간에서 배치가 online 을 산출할 수 없어
    -- WeeklyReportService 가 online=null, reservations=null 로 돌려준다. call 은 실값이 나오지만
    -- V57 시드가 3컬럼을 세트로 확정한 값이라 그중 하나만 배치값으로 갈리면 reservations=call+online
    -- 정합이 깨진다(V57 헤드 주석). 그래서 EXCLUDED.online 이 null 이면(=배치 계산 불가 구간)
    -- 3컬럼을 통째로 시드값으로 유지하고, 산출 가능한 구간(W23~) 에서는 배치값을 그대로 반영한다.
    reservations       = CASE WHEN EXCLUDED.online IS NULL
                              THEN mart_weekly_report.reservations
                              ELSE EXCLUDED.reservations END,
    call_cnt           = CASE WHEN EXCLUDED.online IS NULL
                              THEN mart_weekly_report.call_cnt
                              ELSE EXCLUDED.call_cnt END,
    online             = COALESCE(EXCLUDED.online, mart_weekly_report.online),
    intro_general      = EXCLUDED.intro_general,
    intro_customer     = EXCLUDED.intro_customer,
    intro_staff        = EXCLUDED.intro_staff,
    job_office         = EXCLUDED.job_office,
    job_student        = EXCLUDED.job_student,
    job_etc            = EXCLUDED.job_etc,
    exam_total         = EXCLUDED.exam_total,
    vision_exam        = EXCLUDED.vision_exam,
    cataract_exam      = EXCLUDED.cataract_exam,
    one_day            = EXCLUDED.one_day,
    vision_booked      = EXCLUDED.vision_booked,
    cataract_booked    = EXCLUDED.cataract_booked,
    one_day_booked     = EXCLUDED.one_day_booked,
    stop_count         = EXCLUDED.stop_count,
    exam_general_base  = EXCLUDED.exam_general_base,
    booked_general     = EXCLUDED.booked_general,
    reoperation        = EXCLUDED.reoperation,
    reop_laser         = EXCLUDED.reop_laser,
    reop_lens          = EXCLUDED.reop_lens,
    vision_surgery     = EXCLUDED.vision_surgery,
    cataract_surgery   = EXCLUDED.cataract_surgery,
    total_surgery      = EXCLUDED.total_surgery,
    outpatient         = EXCLUDED.outpatient,
    loaded_at          = CURRENT_TIMESTAMP
