-- 재수술 리스트 마트 적재 (delete+insert 의 insert 쪽).
-- is_lens 는 자바(ReoperationOverlay.isLensCategory)가 계산해 넘긴 값이다 — SQL 에서 다시 판정하지 않는다.
INSERT INTO list_reoperation (
    reop_date, chart_no, name, name_eng, patient_type,
    surgeon, payment, again_r, again_l, reason_cd,
    auto_included, exclude_reason, is_lens
) VALUES (
    CAST(NULLIF(:reopDate, '') AS DATE), :chartNo, :name, :nameEng, :patientType,
    :surgeon, :payment, :againR, :againL, :reasonCd,
    :autoIncluded, :excludeReason, :isLens
)
