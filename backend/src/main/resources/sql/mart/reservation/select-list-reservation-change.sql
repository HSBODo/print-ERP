SELECT
    COALESCE(reserve_num, '')                  AS "reserveNum",
    TO_CHAR(registered_at, 'YYYY-MM-DD')       AS "registeredAt",
    COALESCE(registered_time, '')              AS "registeredTime",
    COALESCE(reg_source, '')                   AS "regSource",
    COALESCE(chart_no, '')                     AS "chartNo",
    COALESCE(name, '')                         AS "name",
    COALESCE(branch, '')                       AS "branch",
    COALESCE(reserve_state, '')                AS "reserveState",
    COALESCE(first_date, '')                   AS "firstDate",
    COALESCE(final_date, '')                   AS "finalDate",
    COALESCE(change_count, 0)                  AS "changeCount",
    COALESCE(change_chain, '')                 AS "changeChain"
  FROM list_reservation_change
 WHERE registered_at >= CAST(:from AS DATE)
   AND registered_at <= CAST(:to   AS DATE)
 ORDER BY registered_at, registered_time, reserve_num
