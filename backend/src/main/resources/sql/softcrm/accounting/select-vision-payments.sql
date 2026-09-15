-- 시력교정 매출(SOFTCRM 비급여 수납) — 결제 전표 상세 1줄 = 1행. 분할결제는 결제수단마다 한 행.
-- 회계 원형(디렉팅/회계/_build-crm.js Q_PAY) 그대로. 취소 전표(CstCnlYnN='Y')도 그대로 읽고
-- Java(VisionReceiptAssembler)가 원행 + 취소행(음수)으로 두 줄을 만든다.
--   · 수납등록자 = CstEmpNum → EMPLOYEE.EMP_NAME, 등록일자 = CstRegDte, 취소 등록일자 = CstModDte
--   · 카드사 = COSTPRICE.COST_CARDCP (단말기 원문), 매입사 = CstMaeNam 우선 → 없으면 CstCrdCpn 코드
--   · 수납모드 = 승인번호(CstPmsNum) 유무로 단말기/수동
-- CstDte 는 char 라 문자열 비교 — :from/:to 는 ISO 'YYYY-MM-DD'.
-- READ-ONLY · MSSQL 2014 호환 · WITH(NOLOCK).
SELECT LTRIM(RTRIM(s.CstCusNum))          AS custNum,
       s.CstSeq                           AS seq,
       s.CstSubSeq                        AS subSeq,
       s.CstDte                           AS receiptDate,
       s.CstPrc                           AS amount,
       ISNULL(s.CstPayWay, '')            AS payWay,
       ISNULL(s.CstMaeNam, '')            AS acquirerName,
       ISNULL(s.CstCrdCpn, '')            AS cardCode,
       ISNULL(s.CstPmsNum, '')            AS approvalNo,
       ISNULL(s.CstCnlYnN, '')            AS cancelYn,
       CONVERT(varchar(19), s.CstRegDte, 120) AS registeredAt,
       CONVERT(varchar(19), s.CstModDte, 120) AS modifiedAt,
       ISNULL(e.EMP_NAME, '')             AS registeredBy,
       ISNULL(c.COST_CARDCP, '')          AS cardCompany,
       ISNULL(c.COST_MEMO, '')            AS paymentMemo,
       ISNULL(cu.CUST_NAME, '')           AS customerName,
       ISNULL(cu.[Level], '')             AS customerGrade,
       ISNULL(mc.EMP_NAME, '')            AS counselor
FROM CstPrcSub s WITH(NOLOCK)
LEFT JOIN COSTPRICE c  WITH(NOLOCK) ON c.CUST_NUM = s.CstCusNum AND c.SEQ = s.CstSeq
LEFT JOIN CUSTOM   cu  WITH(NOLOCK) ON cu.CUST_NUM = s.CstCusNum
LEFT JOIN EMPLOYEE e   WITH(NOLOCK) ON e.EMP_NUM = s.CstEmpNum
LEFT JOIN EMPLOYEE mc  WITH(NOLOCK) ON mc.EMP_NUM = cu.MY_COUNSELOR
WHERE s.CstDte >= :from AND s.CstDte <= :to
ORDER BY s.CstDte, s.CstCusNum, s.CstSeq, s.CstSubSeq
