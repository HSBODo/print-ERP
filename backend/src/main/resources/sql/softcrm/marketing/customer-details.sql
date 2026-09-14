SELECT
    RTRIM(c.CUST_NUM) AS customerNo,
    ISNULL(n.Nation_CodeName, '') AS nationality,
    ISNULL(CONVERT(varchar(10), ch.registeredDate, 120), '') AS registeredDate,
    ISNULL(rv.autoStatus, '') AS status,
    ISNULL(CONVERT(varchar(10), exam.examDate, 120), '') AS examDate,
    ISNULL(CONVERT(varchar(10), op.operationDate, 120), '') AS surgeryDate,
    ISNULL(op.operationRight, '') AS operationRight,
    ISNULL(op.operationLeft, '') AS operationLeft,
    ISNULL(lens.dreamlens, '') AS dreamlens
FROM CUSTOM c WITH(NOLOCK)
LEFT JOIN NationCustom_CFG n WITH(NOLOCK) ON c.NATION_CODE = n.Code
OUTER APPLY (SELECT MIN(Reg_Date) AS registeredDate FROM CUSTOM_HISTORY WITH(NOLOCK) WHERE Cust_num = c.CUST_NUM) ch
OUTER APPLY (
    SELECT TOP 1 CASE RESERVE_FLAG
      WHEN 'O' THEN N'수술완료' WHEN 'M' THEN N'검사예약'
      WHEN 'F' THEN N'외래문의' WHEN 'E' THEN N'외래문의'
      WHEN 'H' THEN N'검사예약' WHEN 'Z' THEN N'검사예약' END AS autoStatus
    FROM RESERVATION WITH(NOLOCK)
    WHERE CUST_NUM = c.CUST_NUM AND RESERVE_STATE <> 'C'
    ORDER BY CASE RESERVE_FLAG WHEN 'O' THEN 1 WHEN 'M' THEN 2 ELSE 3 END
) rv
OUTER APPLY (
    SELECT TOP 1 RESERVE_DATE AS examDate FROM RESERVATION WITH(NOLOCK)
    WHERE CUST_NUM = c.CUST_NUM AND RESERVE_FLAG = 'M' AND RESERVE_STATE <> 'C'
    ORDER BY RESERVE_DATE DESC
) exam
OUTER APPLY (
    SELECT TOP 1 OPERATION_DATE AS operationDate, RTRIM(OPERATIONR) AS operationRight, RTRIM(OPERATIONL) AS operationLeft
    FROM OPERATIONDATA WITH(NOLOCK) WHERE CUST_NUM = c.CUST_NUM ORDER BY OPERATION_DATE DESC
) op
OUTER APPLY (
    SELECT TOP 1 CASE WHEN ISNULL(ln.LENS_NM, '') <> '' AND ISNULL(lt.LENS_NM, '') <> ''
      THEN lt.LENS_NM + ' ' + ln.LENS_NM ELSE ISNULL(lt.LENS_NM, '') END AS dreamlens
    FROM LENS l WITH(NOLOCK)
    LEFT JOIN LENS_CFG lt WITH(NOLOCK) ON lt.LENS_CD = l.LENS_GUBUN
    LEFT JOIN LENS_CFG ln WITH(NOLOCK) ON ln.LENS_CD = l.LENS_KIND
    WHERE l.CUST_NUM = c.CUST_NUM AND l.SEQ = 1
) lens
WHERE c.CUST_NUM IN (:customerNos)  -- CUST_NUM 고정 13자리(docs/db/tables/CUSTOM.md) — RTRIM 없이 인덱스를 탄다
