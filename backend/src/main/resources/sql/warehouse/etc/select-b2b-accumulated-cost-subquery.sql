                COALESCE((
                    SELECT SUM(pr.prcitmqty * pr.prcitmprc)
                    FROM raw.raw_crm_costprice aa
                    LEFT JOIN raw.raw_crm_prcitmlst pr ON aa.cust_num = pr.prccusnum AND aa.seq = pr.prcseq
                    WHERE aa.cust_num = __CUSTOMER_EXPRESSION__
                      AND aa.paystt <> 'a'
                      AND pr.prccod IN (__PRC_CODES__)
                      AND pr.prcitmprc <> 0
                ), 0) AS __ALIAS__
