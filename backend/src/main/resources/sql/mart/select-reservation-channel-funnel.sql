-- 예약 채널별 퍼널 — v_reservation_channel(= 예약자 리스트) 하나에서 뽑는다.
--
-- 단계는 예약자 리스트에서 차례로 걸러내는 것이며, 뒤로 갈수록 앞 단계의 부분집합이다.
--   reserved  전체 예약 (등록일 기준)
--   notCancel 취소(C) 제외
--   visited   미내원(Y) 제외 → 접수(I)·퇴원(H). 실제 내원한 건
--   examined  검사등록일 있음
--   surgery   수술등록일 있음
--
-- ⚠️ 사람이 아니라 **예약 건** 단위다. 같은 사람이 취소하고 다시 잡으면 2건이 맞다.
--    실제로 미등록 고객(차트번호 9999999999999)은 전부 취소·미내원이라 visited 이후엔 남지 않는다.
--    (2026-07 실측: 미등록 602건 = 취소 234 + 미내원 368, 검사 도달 0건)
SELECT
    channel,
    COUNT(*)                                                                    AS reserved,
    COUNT(*) FILTER (WHERE reserve_state <> 'C')                                AS not_cancel,
    COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y'))                     AS visited,
    COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> '')     AS examined,
    COUNT(*) FILTER (WHERE reserve_state NOT IN ('C', 'Y') AND exam_reg_date <> ''
                       AND surgery_reg_date <> '')                              AS surgery
  FROM v_reservation_channel
 WHERE registered_at >= CAST(:from AS DATE)
   AND registered_at <= CAST(:to   AS DATE)
 GROUP BY channel
 ORDER BY reserved DESC
