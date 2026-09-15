-- 진료 수납 내역 — 의사랑(IPLUS) 외래(PAOSUNAB_New) + 입원(PAISUNAB_New) 행 추출.
--
-- ⚠️ 이 파일은 링크드서버 [220.85.109.240] 로 보내는 OPENQUERY 의 "안쪽" 쿼리다.
--   OpenQuerySql 이 주석 제거·공백 축약·따옴표 이스케이프 후 OPENQUERY(...) 로 감싼다.
--   · 원격 서버에서 실행되므로 :from 바인딩이 불가 — __OQ_FROM__/__OQ_TO__ 를 ISO 날짜로 치환한다.
--   · OPENQUERY 문자열 상한 8,000자 — 주석은 제거되지만 본문이 길어지지 않게 유지할 것.
--   · 수납일자·입원일자는 char 'YYYY-MM-DD' 라 문자열 비교로 동작한다.
--
-- 회계 원형(디렉팅/회계/_build-data.js) 의 쿼리를 그대로 옮긴 것. 컬럼 의미:
--   receiptType  외래/입원 (테이블 출처)
--   insuranceType 일련번호 99 = 미수입금, 98 = 환불금, 그 외 SETKIND.KINDNAME
--   healthLivingExpense 건생비 = NHICM4AP.cfhcDmdAmt (98·99 행은 0)
--   refund/outstandingOccurred/outstandingRecovered 는 PAYTRANS 결제구분 (81·82 / 90 / 91·92·93)
--   outstandingCard·Cash·Transfer 는 91/92/93 개별, refundOccurred 는 80(진료일자 기준)
--   room/revenueType 외래는 PMOOTPTH→PICROOM 진료실, 진료실이 없거나 '백내장' 이면 입원외, 아니면 기타외래
--   status 1 = 정상, 그 외 취소 · closed 마감여부
SELECT A.수납일자 AS receiptDate,
       ISNULL(P.PTNTNAME,'') AS patientName,
       CASE WHEN A.일련번호 = 99 THEN '미수입금' WHEN A.일련번호 = 98 THEN '환불금' ELSE ISNULL(K.KINDNAME,'') END AS insuranceType,
       A.PTNTIDNO AS chartNo, ISNULL(D.USERNAME,'') AS doctor, ISNULL(E.USERNAME,'') AS receiptStaff, '외래' AS receiptType,
       ISNULL(CONVERT(varchar(5), A.MODIFYDATE, 108),'') AS receiptTime, A.일련번호 AS serialNo,
       A.전액본인부담 AS hundredCopay, A.백대백미만본인부담 AS hundredUnpaid, A.급여총액 AS salaryTotal, A.청구액 AS claimAmount, A.본인부담액 AS copay,
       A.비급여액 AS nonCovered, A.수납할금액 AS totalCopay, A.복지지원금 AS welfareSupport, A.장애인진료비 AS disabledSupport, A.지원금 AS supportAmount,
       CASE WHEN A.일련번호 IN (98,99) THEN 0
            ELSE ISNULL((SELECT TOP 1 CONVERT(INT, N.cfhcDmdAmt) FROM IPLUS.dbo.NHICM4AP N
                         WHERE N.PTNTIDNO = A.PTNTIDNO AND N.SRNO = A.일련번호
                           AND REPLACE(N.[date],'-','') = REPLACE(A.수납일자,'-','')
                         ORDER BY N.nhicdate DESC), 0) END AS healthLivingExpense,
       A.실수납액 AS actualPaid, A.미수금 AS outstanding, A.할인액 AS discount, ISNULL(A.할인사유,'') AS discountReason,
       A.카드수납 AS card, A.현금수납 AS cash, A.상태 AS status, A.마감여부 AS closed,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T
               WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.수납일자=A.수납일자
                 AND T.일련번호=A.일련번호 AND T.결제구분 IN ('81','82')),0) AS refund,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T
               WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.진료일자=A.수납일자
                 AND T.일련번호=A.일련번호 AND T.결제구분='90'),0) AS outstandingOccurred,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T
               WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.수납일자=A.수납일자
                 AND T.일련번호=A.일련번호 AND T.결제구분 IN ('91','92','93')),0) AS outstandingRecovered,
       ISNULL(RM.ROOMNAME,'') AS room,
       CASE WHEN ISNULL(RM.ROOMNAME,'') IN ('', '백내장') THEN '입원외' ELSE '기타외래' END AS revenueType,
       A.통장수납 AS transfer,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.수납일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '91'),0) AS outstandingCard,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.수납일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '92'),0) AS outstandingCash,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.수납일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '93'),0) AS outstandingTransfer,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=A.HOSPCODE AND T.PTNTIDNO=A.PTNTIDNO AND T.진료일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '80'),0) AS refundOccurred,
       ISNULL((SELECT SUM(CAST(RC.승인금액 AS BIGINT)) FROM IPLUS.dbo.RECEIPTCASH RC
               WHERE RC.HOSPCODE=A.HOSPCODE AND RC.PTNTIDNO=A.PTNTIDNO
                 AND RC.진료일자=A.수납일자 AND RC.일련번호=A.일련번호),0) AS cashReceipt
FROM IPLUS.dbo.PAOSUNAB_New A
LEFT JOIN IPLUS.dbo.PMCPTNT  P ON P.HOSPCODE = A.HOSPCODE AND P.PTNTIDNO = A.PTNTIDNO
LEFT JOIN IPLUS.dbo.SETKIND  K ON K.KINDKEY  = A.보험유형
LEFT JOIN IPLUS.dbo.PICUSERM D ON D.HOSPCODE = A.HOSPCODE AND D.USERID = A.진료의사
LEFT JOIN IPLUS.dbo.PICUSERM E ON E.HOSPCODE = A.HOSPCODE AND E.USERID = A.수납직원
LEFT JOIN IPLUS.dbo.PMOOTPTH OT ON OT.HOSPCODE = A.HOSPCODE AND OT.PTNTIDNO = A.PTNTIDNO
     AND REPLACE(A.수납일자,'-','') = OT.OTPTMDDT AND A.일련번호 = OT.OTPTSRNO
LEFT JOIN IPLUS.dbo.PICROOM RM ON RTRIM(CAST(RM.ROOMCODE AS varchar(10))) = RTRIM(CAST(OT.OTPTROOM AS varchar(10)))
WHERE A.수납일자 >= '__OQ_FROM__' AND A.수납일자 <= '__OQ_TO__'
UNION ALL
SELECT B.입원일자, ISNULL(P.PTNTNAME,''), ISNULL(K.KINDNAME,''), B.PTNTIDNO,
       ISNULL(D.USERNAME,''), ISNULL(E.USERNAME,''), '입원',
       ISNULL(CONVERT(varchar(5), B.MODIFYDATE, 108),''), 0,
       B.전액본인부담, B.백대백미만본인부담, B.급여총액, B.청구액, B.본인부담액,
       B.비급여액, B.수납할금액, B.복지지원금, B.장애인진료비, B.지원금,
       ISNULL((SELECT TOP 1 CONVERT(INT, N.cfhcDmdAmt) FROM IPLUS.dbo.NHICM4AP N
               WHERE N.PTNTIDNO = B.PTNTIDNO AND N.SRNO = '0'
                 AND REPLACE(N.[date],'-','') = REPLACE(B.입원일자,'-','')
               ORDER BY N.nhicdate DESC), 0),
       B.실수납액, B.미수금, B.할인액, ISNULL(B.할인사유,''),
       B.카드수납, B.현금수납, B.상태, B.마감여부,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T
               WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.수납일자=B.입원일자
                 AND T.결제구분 IN ('81','82')),0),
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T
               WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.진료일자=B.입원일자
                 AND T.결제구분='90'),0),
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T
               WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.수납일자=B.입원일자
                 AND T.결제구분 IN ('91','92','93')),0),
       '', '입원',
       B.통장수납,
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.수납일자=B.입원일자 AND T.결제구분 = '91'),0),
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.수납일자=B.입원일자 AND T.결제구분 = '92'),0),
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.수납일자=B.입원일자 AND T.결제구분 = '93'),0),
       ISNULL((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM IPLUS.dbo.PAYTRANS T WHERE T.HOSPCODE=B.HOSPCODE AND T.PTNTIDNO=B.PTNTIDNO AND T.진료일자=B.입원일자 AND T.결제구분 = '80'),0),
       ISNULL((SELECT SUM(CAST(RC.승인금액 AS BIGINT)) FROM IPLUS.dbo.RECEIPTCASH RC
               WHERE RC.HOSPCODE=B.HOSPCODE AND RC.PTNTIDNO=B.PTNTIDNO
                 AND RC.진료일자=B.입원일자),0)
FROM IPLUS.dbo.PAISUNAB_New B
LEFT JOIN IPLUS.dbo.PMCPTNT  P ON P.HOSPCODE = B.HOSPCODE AND P.PTNTIDNO = B.PTNTIDNO
LEFT JOIN IPLUS.dbo.SETKIND  K ON K.KINDKEY  = B.보험유형
LEFT JOIN IPLUS.dbo.PICUSERM D ON D.HOSPCODE = B.HOSPCODE AND D.USERID = B.진료의사
LEFT JOIN IPLUS.dbo.PICUSERM E ON E.HOSPCODE = B.HOSPCODE AND E.USERID = B.수납직원
WHERE B.입원일자 >= '__OQ_FROM__' AND B.입원일자 <= '__OQ_TO__'
