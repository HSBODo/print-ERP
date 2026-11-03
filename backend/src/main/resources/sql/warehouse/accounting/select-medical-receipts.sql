-- 진료 수납 내역 — PAOSUNAB_New + PAISUNAB_New (Postgres · 웨어하우스 라우팅).
-- MSSQL 정본: sql/iplus/accounting/select-medical-receipts-inner.sql (OPENQUERY 안쪽 쿼리).
-- 방언 변환 정본: docs/data-platform/migration-strategy.md §4.2 · A8 unblock (2026-10-06).
-- OPENQUERY 제거 — raw.raw_emr_* 직접 조회 + 네임드 바인딩 :from/:to 사용.
SELECT A.수납일자 AS "receiptDate",
       COALESCE(P.ptntname,'') AS "patientName",
       CASE WHEN A.일련번호 = 99 THEN '미수입금'
            WHEN A.일련번호 = 98 THEN '환불금'
            ELSE COALESCE(K.kindname,'') END AS "insuranceType",
       A.ptntidno AS "chartNo",
       COALESCE(D.username,'') AS doctor,
       COALESCE(E.username,'') AS "receiptStaff",
       '외래' AS "receiptType",
       COALESCE(TO_CHAR(A.modifydate, 'HH24:MI'),'') AS "receiptTime",
       A.일련번호 AS "serialNo",
       A.전액본인부담 AS "hundredCopay",
       A.백대백미만본인부담 AS "hundredUnpaid",
       A.급여총액 AS "salaryTotal",
       A.청구액 AS "claimAmount",
       A.본인부담액 AS copay,
       A.비급여액 AS "nonCovered",
       A.수납할금액 AS "totalCopay",
       A.복지지원금 AS "welfareSupport",
       A.장애인진료비 AS "disabledSupport",
       A.지원금 AS "supportAmount",
       CASE WHEN A.일련번호 IN (98,99) THEN 0
            ELSE COALESCE((SELECT CAST(N.cfhcdmdamt AS INT) FROM raw.raw_emr_nhicm4ap N
                         WHERE N.ptntidno = A.ptntidno AND N.srno = CAST(A.일련번호 AS varchar)
                           AND REPLACE(N."date",'-','') = REPLACE(A.수납일자,'-','')
                         ORDER BY N.nhicdate DESC
                         LIMIT 1), 0) END AS "healthLivingExpense",
       A.실수납액 AS "actualPaid",
       A.미수금 AS outstanding,
       A.할인액 AS discount,
       COALESCE(A.할인사유,'') AS "discountReason",
       A.카드수납 AS card,
       A.현금수납 AS cash,
       A.상태 AS status,
       A.마감여부 AS closed,
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T
               WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.수납일자=A.수납일자
                 AND T.일련번호=A.일련번호 AND T.결제구분 IN ('81','82')),0) AS refund,
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T
               WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.진료일자=A.수납일자
                 AND T.일련번호=A.일련번호 AND T.결제구분='90'),0) AS "outstandingOccurred",
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T
               WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.수납일자=A.수납일자
                 AND T.일련번호=A.일련번호 AND T.결제구분 IN ('91','92','93')),0) AS "outstandingRecovered",
       COALESCE(RM.roomname,'') AS room,
       CASE WHEN COALESCE(RM.roomname,'') IN ('', '백내장') THEN '입원외' ELSE '기타외래' END AS "revenueType",
       A.통장수납 AS transfer,
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.수납일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '91'),0) AS "outstandingCard",
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.수납일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '92'),0) AS "outstandingCash",
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.수납일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '93'),0) AS "outstandingTransfer",
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=A.hospcode AND T.ptntidno=A.ptntidno AND T.진료일자=A.수납일자 AND T.일련번호=A.일련번호 AND T.결제구분 = '80'),0) AS "refundOccurred",
       COALESCE((SELECT SUM(CAST(RC.승인금액 AS BIGINT)) FROM raw.raw_emr_receiptcash RC
               WHERE RC.hospcode=A.hospcode AND RC.ptntidno=A.ptntidno
                 AND RC.진료일자=A.수납일자 AND RC.일련번호=A.일련번호),0) AS "cashReceipt"
FROM raw.raw_emr_paosunab_new A
LEFT JOIN raw.raw_emr_pmcptnt  P ON P.hospcode = A.hospcode AND P.ptntidno = A.ptntidno
LEFT JOIN raw.raw_emr_setkind  K ON K.kindkey  = A.보험유형
LEFT JOIN raw.raw_emr_picuserm D ON D.hospcode = A.hospcode AND D.userid = A.진료의사
LEFT JOIN raw.raw_emr_picuserm E ON E.hospcode = A.hospcode AND E.userid = A.수납직원
LEFT JOIN raw.raw_emr_pmootpth OT ON OT.hospcode = A.hospcode AND OT.ptntidno = A.ptntidno
     AND REPLACE(A.수납일자,'-','') = OT.otptmddt AND A.일련번호 = OT.otptsrno
LEFT JOIN raw.raw_emr_picroom RM ON RTRIM(CAST(RM.roomcode AS varchar(10))) = RTRIM(CAST(OT.otptroom AS varchar(10)))
WHERE A.수납일자 >= :from AND A.수납일자 <= :to
UNION ALL
SELECT B.입원일자, COALESCE(P.ptntname,''), COALESCE(K.kindname,''), B.ptntidno,
       COALESCE(D.username,''), COALESCE(E.username,''), '입원',
       COALESCE(TO_CHAR(B.modifydate, 'HH24:MI'),''), 0,
       B.전액본인부담, B.백대백미만본인부담, B.급여총액, B.청구액, B.본인부담액,
       B.비급여액, B.수납할금액, B.복지지원금, B.장애인진료비, B.지원금,
       COALESCE((SELECT CAST(N.cfhcdmdamt AS INT) FROM raw.raw_emr_nhicm4ap N
               WHERE N.ptntidno = B.ptntidno AND N.srno = '0'
                 AND REPLACE(N."date",'-','') = REPLACE(B.입원일자,'-','')
               ORDER BY N.nhicdate DESC
               LIMIT 1), 0),
       B.실수납액, B.미수금, B.할인액, COALESCE(B.할인사유,''),
       B.카드수납, B.현금수납, B.상태, B.마감여부,
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T
               WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.수납일자=B.입원일자
                 AND T.결제구분 IN ('81','82')),0),
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T
               WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.진료일자=B.입원일자
                 AND T.결제구분='90'),0),
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T
               WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.수납일자=B.입원일자
                 AND T.결제구분 IN ('91','92','93')),0),
       '', '입원',
       B.통장수납,
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.수납일자=B.입원일자 AND T.결제구분 = '91'),0),
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.수납일자=B.입원일자 AND T.결제구분 = '92'),0),
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.수납일자=B.입원일자 AND T.결제구분 = '93'),0),
       COALESCE((SELECT SUM(CAST(T.승인금액 AS BIGINT)) FROM raw.raw_emr_paytrans T WHERE T.hospcode=B.hospcode AND T.ptntidno=B.ptntidno AND T.진료일자=B.입원일자 AND T.결제구분 = '80'),0),
       COALESCE((SELECT SUM(CAST(RC.승인금액 AS BIGINT)) FROM raw.raw_emr_receiptcash RC
               WHERE RC.hospcode=B.hospcode AND RC.ptntidno=B.ptntidno
                 AND RC.진료일자=B.입원일자),0)
FROM raw.raw_emr_paisunab_new B
LEFT JOIN raw.raw_emr_pmcptnt  P ON P.hospcode = B.hospcode AND P.ptntidno = B.ptntidno
LEFT JOIN raw.raw_emr_setkind  K ON K.kindkey  = B.보험유형
LEFT JOIN raw.raw_emr_picuserm D ON D.hospcode = B.hospcode AND D.userid = B.진료의사
LEFT JOIN raw.raw_emr_picuserm E ON E.hospcode = B.hospcode AND E.userid = B.수납직원
WHERE B.입원일자 >= :from AND B.입원일자 <= :to
