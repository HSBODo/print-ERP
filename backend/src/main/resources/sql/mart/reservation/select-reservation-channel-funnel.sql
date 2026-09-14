-- 예약 채널별 퍼널 — v_reservation_channel(= 예약자 리스트) 하나에서 뽑는다.
--
-- 단계는 예약자 리스트에서 차례로 걸러내는 것이며, 뒤로 갈수록 앞 단계의 부분집합이다.
--   reserved     전체 예약 (등록일 기준)
--   notCancel    취소(C) 제외
--   visited      미내원(Y)까지 제외 → 접수(I)·퇴원(H). 실제 내원한 건
--   examined     검사등록일 있음
--   notStop      그중 검사중단(exam_stop='Y')이 아닌 건
--                2026-07 실측: 검사 936건 중 중단 40건이고 **그 40건은 수술등록이 0건**이다.
--                중단하면 수술로 가지 않으므로 검사와 수술등록 사이에 두는 게 맞다.
--   surgery      수술등록일 있음 (= 수술예약을 잡은 사람. 수술한 날이 아니다)
--   surgeryDone  그중 실제 수술일이 있는 건 (= 수술 완료)
--   reop         그중 나중에 재수술까지 간 건
--
-- ★ 수술대기는 별도 단계로 두지 않는다 — surgery − surgeryDone 이 정확히 대기 인원이고,
--   화면이 단계 사이 이탈로 이미 그린다. 컬럼을 따로 두면 같은 숫자가 두 벌이 된다.
--   2026-07 실측: 수술등록 735 = 완료 579 + 대기 156.
--
-- ⚠️ 재수술은 코호트 기준이다 — "그 달에 예약한 사람이 나중에 재수술까지 갔나".
--    재수술은 원수술 몇 달~몇 년 뒤에 일어나는데 list_reoperation 이 2026-01 부터라
--    최근 코호트일수록 0 으로 나온다(2026-01 코호트 3명, 07 코호트 0명). 이건 정상이며,
--    데이터가 쌓일수록 채워진다. "그 달에 재수술한 사람"을 세는 게 아니다.
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
    -- 단계 판정을 여기서 한 번만 한다. 아래 집계가 이 불린만 쓰므로
    -- 조건이 열 몇 벌로 복사되지 않는다(전에는 FILTER 마다 같은 AND 체인을 반복했다).
    SELECT
        v.channel,
        v.person,
        v.surgery_payment,
        v.reserve_state <> 'C'                                       AS s_not_cancel,
        v.reserve_state NOT IN ('C', 'Y')                            AS s_visited,
        v.reserve_state NOT IN ('C', 'Y') AND v.exam_reg_date <> ''  AS s_examined,
        v.reserve_state NOT IN ('C', 'Y') AND v.exam_reg_date <> ''
            AND v.exam_stop <> 'Y'                                   AS s_not_stop,
        v.reserve_state NOT IN ('C', 'Y') AND v.exam_reg_date <> ''
            AND v.exam_stop <> 'Y' AND v.surgery_reg_date <> ''      AS s_surgery,
        v.reserve_state NOT IN ('C', 'Y') AND v.exam_reg_date <> ''
            AND v.exam_stop <> 'Y' AND v.surgery_reg_date <> ''
            AND v.surgery_date <> ''                                 AS s_done,
        v.reserve_state NOT IN ('C', 'Y') AND v.exam_reg_date <> ''
            AND v.exam_stop <> 'Y' AND v.surgery_reg_date <> ''
            AND v.surgery_date <> ''
            -- 재수술 판정. 자동포함 행만 센다 — 세척·재위치·백내장은 재수술이 아니다
            -- (select-reoperation-candidates.sql 과 같은 기준, auto_included 로 이미 판정돼 있다).
            -- 차트번호로 잇는다. 더미 차트번호는 서로 다른 사람이 한 명으로 뭉개지므로 제외한다.
            -- reop_date >= surgery_date : 이번 수술 **이후**의 재수술만. 예전 수술의 재수술은
            -- 이번 유입의 결과가 아니라서 세면 안 된다.
            AND v.chart_no <> '9999999999999'
            AND EXISTS (
                SELECT 1
                  FROM list_reoperation ro
                 WHERE ro.chart_no = v.chart_no
                   AND ro.auto_included = 1
                   AND ro.reop_date >= v.surgery_date::date
            )                                                        AS s_reop
      FROM v_reservation_channel v
     WHERE v.registered_at >= CAST(:from AS DATE)
       AND v.registered_at <= CAST(:to   AS DATE)
), per_channel AS (
    SELECT
        channel,
        COUNT(*)                                      AS reserved,
        COUNT(*) FILTER (WHERE s_not_cancel)          AS not_cancel,
        COUNT(*) FILTER (WHERE s_visited)             AS visited,
        COUNT(*) FILTER (WHERE s_examined)            AS examined,
        COUNT(*) FILTER (WHERE s_not_stop)            AS not_stop,
        COUNT(*) FILTER (WHERE s_surgery)             AS surgery,
        COUNT(*) FILTER (WHERE s_done)                AS surgery_done,
        COUNT(*) FILTER (WHERE s_reop)                AS reop,
        COALESCE(SUM(surgery_payment) FILTER (WHERE s_surgery), 0) AS surgery_amount,
        COUNT(DISTINCT person)                                     AS reserved_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_not_cancel)         AS not_cancel_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_visited)            AS visited_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_examined)           AS examined_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_not_stop)           AS not_stop_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_surgery)            AS surgery_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_done)               AS surgery_done_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_reop)               AS reop_persons,
        -- 객단가 분모 — 실제로 수납이 잡힌 사람만. 수술등록 인원으로 나누면
        -- 아직 수술 전인 사람(매출 0)이 섞여 객단가가 낮게 나온다(2026-07: 274만 vs 실제 353만).
        COUNT(DISTINCT person) FILTER (WHERE s_surgery AND surgery_payment > 0) AS surgery_paid_persons
      FROM src
     GROUP BY channel
), tot AS (
    SELECT
        COUNT(DISTINCT person)                                     AS total_reserved_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_not_cancel)         AS total_not_cancel_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_visited)            AS total_visited_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_examined)           AS total_examined_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_not_stop)           AS total_not_stop_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_surgery)            AS total_surgery_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_done)               AS total_surgery_done_persons,
        COUNT(DISTINCT person) FILTER (WHERE s_reop)               AS total_reop_persons,
        COALESCE(SUM(surgery_payment) FILTER (WHERE s_surgery), 0) AS total_surgery_amount,
        COUNT(DISTINCT person) FILTER (WHERE s_surgery AND surgery_payment > 0) AS total_surgery_paid_persons
      FROM src
)
SELECT
    a.channel,
    COALESCE(p.reserved, 0)             AS reserved,
    COALESCE(p.not_cancel, 0)           AS not_cancel,
    COALESCE(p.visited, 0)              AS visited,
    COALESCE(p.examined, 0)             AS examined,
    COALESCE(p.not_stop, 0)             AS not_stop,
    COALESCE(p.surgery, 0)              AS surgery,
    COALESCE(p.surgery_done, 0)         AS surgery_done,
    COALESCE(p.reop, 0)                 AS reop,
    COALESCE(p.surgery_amount, 0)       AS surgery_amount,
    COALESCE(p.reserved_persons, 0)     AS reserved_persons,
    COALESCE(p.not_cancel_persons, 0)   AS not_cancel_persons,
    COALESCE(p.visited_persons, 0)      AS visited_persons,
    COALESCE(p.examined_persons, 0)     AS examined_persons,
    COALESCE(p.not_stop_persons, 0)     AS not_stop_persons,
    COALESCE(p.surgery_persons, 0)      AS surgery_persons,
    COALESCE(p.surgery_done_persons, 0) AS surgery_done_persons,
    COALESCE(p.reop_persons, 0)         AS reop_persons,
    COALESCE(p.surgery_paid_persons, 0) AS surgery_paid_persons,
    t.total_reserved_persons,
    t.total_not_cancel_persons,
    t.total_visited_persons,
    t.total_examined_persons,
    t.total_not_stop_persons,
    t.total_surgery_persons,
    t.total_surgery_done_persons,
    t.total_reop_persons,
    t.total_surgery_amount,
    t.total_surgery_paid_persons
  FROM all_channels a
  LEFT JOIN per_channel p ON p.channel = a.channel
  CROSS JOIN tot t
 ORDER BY COALESCE(p.reserved, 0) DESC, a.channel
