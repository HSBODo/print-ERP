                ISNULL((
                    SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
                    FROM COSTPRICE aa WITH(NOLOCK)
                    LEFT JOIN PrcItmLst pr WITH(NOLOCK) ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
                    WHERE aa.CUST_NUM = __CUSTOMER_EXPRESSION__
                      AND aa.PayStt <> 'a'
                      AND pr.PrcCod IN (__PRC_CODES__)
                      AND pr.PrcItmPrc <> 0
                ), 0) AS __ALIAS__
