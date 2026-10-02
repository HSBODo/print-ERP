                COALESCE((
                    SELECT SUM(pr.prcitmqty * pr.prcitmprc)
                    FROM raw.raw_crm_costprice aa
                    LEFT JOIN raw.raw_crm_prcitmlst pr ON aa.cust_num = pr.prccusnum AND aa.seq = pr.prcseq
                    WHERE aa.cust_num = __CUSTOMER_EXPRESSION__
                      AND aa.paystt <> 'a'
                      AND aa.cost_date = (
                          SELECT MAX(y.cost_date)
                          FROM raw.raw_crm_costprice y
                          LEFT JOIN raw.raw_crm_prcitmlst z ON y.cust_num = z.prccusnum AND y.seq = z.prcseq
                          WHERE y.cust_num = __CUSTOMER_EXPRESSION__
                            AND y.paystt <> 'a'
                            AND z.prccod = pr.prccod
                            AND z.prcitmprc <> 0
                __DATE_CONDITION__
                      )
                      AND pr.prccod IN (__PRC_CODES__)
                      AND pr.prcitmprc <> 0
                ), 0) AS __ALIAS__
