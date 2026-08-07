-- 예약 채널별 퍼널 — v_reservation_channel(= 예약자 리스트) 하나에서 뽑는다.
--
-- 단계는 예약자 리스트에서 차례로 걸러내는 것이며, 뒤로 갈수록 앞 단계의 부분집합이다.
--   reserved  전체 예약 (등록일 기준)
--   notCancel 취소(C) 제외
--   visited   미내원(Y)까지 제외 → 접수(I)·퇴원(H). 실제 내원한 건
--   examined  검사등록일 있음
--   notStop   그중 검사중단(exam_stop='Y')이 아닌 건
--             2026-07 실측: 검사 936건 중 중단 40건이고 **그 40건은 수술등록이 0건**이다.
--             중단하면 수술로 가지 않으므로 검사와 수술등록 사이에 두는 게 맞다.
--   surgery   수술등록일 있음
--
-- ★ 건수와 사람수를 같이 낸다 — 세는 단위가 다르고 둘 다 필요하다.
--     건수   채널이 몇 번 일했나. 취소 후 재예약도 채널이 두 번 유치한 것이라 2 로 센다(광고 효율)
--     사람수 실제 몇 명이 왔나. 환자 규모·검사실 부하를 볼 때 쓴다
--   2026-07 실측 — 예약 1,555건/1,540명, 접수 935건/933명.
--
-- ★ 조회 기간에 유입이 0 인 채널도 행으로 낸다(all_channels LEFT JOIN).
--   빠뜨리면 "채널이 없는 것"과 "이번 달 0명"이 화면에서 구분되지 않고,
--   달을 바꿀 때마다 행 수가 흔들려 표를 읽기 어렵다.
--   목록은 뷰 **전 기간**의 DISTINCT 라 화면에 채널 이름을 하드코딩하지 않는다 —
--   분류 규칙을 뷰에서 고치면 목록도 따라온다.
--
-- ⚠️ 사람수는 채널별 DISTINCT 라 **채널 합계 ≠ 전체 사람수** 다.
--    한 사람이 두 채널로 예약하면 채널마다 1 명씩 세어진다.
--    그래서 전체 기준 사람수를 tot CTE 로 따로 구해 모든 행에 실어 보낸다.
--    화면 합계행은 채널 값을 더하지 말고 이 total_* 을 그대로 쓸 것.
--
-- ⚠️ COUNT(DISTINCT ...) OVER () 는 Postgres 가 지원하지 않는다("DISTINCT is not
--    implemented for window functions"). 전체 집계는 반드시 별도 CTE 로 구한다.
WITH all_channels AS (
    SELECT DISTINCT channel FROM v_reservation_channel
), src AS (
    SELECT channel, person, reserve_state, exam_reg_date, exam_stop, surgery_reg_date, surgery_payment
      FROM v_reservation_channel
     WHERE registered_at >= CAST(:from AS DATE)
       AND registered_at <= CAST(:to   AS DATE)
), per_channel AS (
    SELECT
        channel,
        COUNT(*)                                                                        AS reserved,
        COUNT(*) FILTER (WHERE reserve_state <> 'C')                                    AS not_cancel,
        COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y'))                         AS visited,
        COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '') AS examined,
        COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y') AS not_stop,
        COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> '')                                  AS surgery,
        COALESCE(SUM(surgery_payment) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> ''), 0)         AS surgery_amount,
        COUNT(DISTINCT person)                                                          AS reserved_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state <> 'C')                      AS not_cancel_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y'))           AS visited_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '')                       AS examined_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y')                     AS not_stop_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> '')                    AS surgery_persons,
        -- 객단가 분모 — 실제로 수납이 잡힌 사람만. 수술등록 인원으로 나누면
        -- 아직 수술 전인 사람(매출 0)이 섞여 객단가가 낮게 나온다(2026-07: 274만 vs 실제 353만).
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> '' AND surgery_payment > 0)                    AS surgery_paid_persons
      FROM src
     GROUP BY channel
), tot AS (
    SELECT
        COUNT(DISTINCT person)                                                          AS total_reserved_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state <> 'C')                      AS total_not_cancel_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y'))           AS total_visited_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '')                       AS total_examined_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y')                     AS total_not_stop_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> '')                    AS total_surgery_persons,
        COALESCE(SUM(surgery_payment) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> ''), 0)          AS total_surgery_amount,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '' AND exam_stop <> 'Y'
                           AND surgery_reg_date <> '' AND surgery_payment > 0)              AS total_surgery_paid_persons
      FROM src
)
SELECT
    a.channel,
    COALESCE(p.reserved, 0)            AS reserved,
    COALESCE(p.not_cancel, 0)          AS not_cancel,
    COALESCE(p.visited, 0)             AS visited,
    COALESCE(p.examined, 0)            AS examined,
    COALESCE(p.not_stop, 0)            AS not_stop,
    COALESCE(p.surgery, 0)             AS surgery,
    COALESCE(p.surgery_amount, 0)      AS surgery_amount,
    COALESCE(p.reserved_persons, 0)    AS reserved_persons,
    COALESCE(p.not_cancel_persons, 0)  AS not_cancel_persons,
    COALESCE(p.visited_persons, 0)     AS visited_persons,
    COALESCE(p.examined_persons, 0)    AS examined_persons,
    COALESCE(p.not_stop_persons, 0)    AS not_stop_persons,
    COALESCE(p.surgery_persons, 0)     AS surgery_persons,
    COALESCE(p.surgery_paid_persons, 0) AS surgery_paid_persons,
    t.total_reserved_persons,
    t.total_not_cancel_persons,
    t.total_visited_persons,
    t.total_examined_persons,
    t.total_not_stop_persons,
    t.total_surgery_persons,
    t.total_surgery_amount,
    t.total_surgery_paid_persons
  FROM all_channels a
  LEFT JOIN per_channel p ON p.channel = a.channel
  CROSS JOIN tot t
 ORDER BY COALESCE(p.reserved, 0) DESC, a.channel
