                ISNULL((
                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                    FROM COSTPRICE aa WITH(NOLOCK)
                    LEFT JOIN PrcItmLst pr WITH(NOLOCK) ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                    WHERE aa.CUST_NUM = __CUSTOMER_EXPRESSION__
                      AND aa.PayStt <> 'a'
                      AND aa.COST_DATE = (
                          SELECT MAX(y.COST_DATE)
                          FROM COSTPRICE y WITH(NOLOCK)
                          LEFT JOIN PrcItmLst z WITH(NOLOCK) ON y.CUST_NUM = z.PrcCusNum AND y.SEQ = z.prcseq
                          WHERE y.CUST_NUM = __CUSTOMER_EXPRESSION__
                            AND y.PayStt <> 'a'
                            AND z.PrcCod = pr.PrcCod
                            AND z.PrcItmPrc <> 0
                __DATE_CONDITION__
                      )
                      AND pr.PrcCod IN (__PRC_CODES__)
                      AND pr.PrcItmPrc <> 0
                ), 0) AS __ALIAS__
