-- 예약 채널별 퍼널 — v_reservation_channel(= 예약자 리스트) 하나에서 뽑는다.
--
-- 단계는 예약자 리스트에서 차례로 걸러내는 것이며, 뒤로 갈수록 앞 단계의 부분집합이다.
--   reserved  전체 예약 (등록일 기준)
--   notCancel 취소(C) 제외
--   visited   미내원(Y)까지 제외 → 접수(I)·퇴원(H). 실제 내원한 건
--   examined  검사등록일 있음
--   surgery   수술등록일 있음
--
-- ★ 건수와 사람수를 같이 낸다 — 세는 단위가 다르고 둘 다 필요하다.
--     건수   채널이 몇 번 일했나. 취소 후 재예약도 채널이 두 번 유치한 것이라 2 로 센다(광고 효율)
--     사람수 실제 몇 명이 왔나. 환자 규모·검사실 부하를 볼 때 쓴다
--   2026-07 실측 — 예약 1,555건/1,460명, 접수 935건/891명.
--   즉 그 달에 44명이 두 번 이상 내원 예약을 했다.
--
-- ⚠️ 사람수는 채널별 DISTINCT 라 **채널 합계 ≠ 전체 사람수** 다.
--    한 사람이 두 채널로 예약하면 채널마다 1 명씩 세어진다.
--    그래서 전체 기준 사람수를 tot CTE 로 따로 구해 모든 행에 실어 보낸다.
--    화면 합계행은 채널 값을 더하지 말고 이 total_* 을 그대로 쓸 것.
--
-- ⚠️ COUNT(DISTINCT ...) OVER () 는 Postgres 가 지원하지 않는다("DISTINCT is not
--    implemented for window functions"). 전체 집계는 반드시 별도 CTE 로 구한다.
WITH src AS (
    SELECT channel, person, reserve_state, exam_reg_date, surgery_reg_date
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
        COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> ''
                           AND surgery_reg_date <> '')                                  AS surgery,
        COUNT(DISTINCT person)                                                          AS reserved_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state <> 'C')                      AS not_cancel_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y'))           AS visited_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y')
                                         AND exam_reg_date <> '')                       AS examined_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y')
                                         AND exam_reg_date <> ''
                                         AND surgery_reg_date <> '')                    AS surgery_persons
      FROM src
     GROUP BY channel
), tot AS (
    SELECT
        COUNT(DISTINCT person)                                                          AS total_reserved_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state <> 'C')                      AS total_not_cancel_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y'))           AS total_visited_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y')
                                         AND exam_reg_date <> '')                       AS total_examined_persons,
        COUNT(DISTINCT person) FILTER (WHERE reserve_state NOT IN ('C', 'Y')
                                         AND exam_reg_date <> ''
                                         AND surgery_reg_date <> '')                    AS total_surgery_persons
      FROM src
)
SELECT p.*, t.*
  FROM per_channel p CROSS JOIN tot t
 ORDER BY p.reserved DESC
