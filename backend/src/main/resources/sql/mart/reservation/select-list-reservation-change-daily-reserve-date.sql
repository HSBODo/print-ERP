-- 추이 달력 · 예약일 기준 — 그 날로 예약이 잡혀 있는(최종 예약일) 검사예약 수와 그중 예약일이 바뀐 수 (구분별).
-- final_date 는 'YYYY-MM-DD' 문자열이라 문자열 범위 비교(사전순 = 날짜순). 빈 값은 범위 밖으로 빠진다.
-- 미래 달도 조회된다 — 아직 오지 않은 예약일에 잡힌 예약(기획서 §6 "미래 예약까지 표시").
SELECT
    final_date                                              AS "day",
    COALESCE(branch, '')                                    AS "branch",
    COUNT(*)::INT                                           AS "total",
    SUM(CASE WHEN change_count >= 1 THEN 1 ELSE 0 END)::INT AS "changed"
  FROM list_reservation_change
 WHERE final_date >= :from
   AND final_date <= :to
 GROUP BY final_date, branch
 ORDER BY final_date, branch
