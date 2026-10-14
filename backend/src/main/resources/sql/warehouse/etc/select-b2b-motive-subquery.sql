                SELECT
                    CASE
                        WHEN a.motive01 LIKE '%B2B(기업)%' OR a.motive01 LIKE '%B2B(군인)%'
                            THEN a.motive01
                        ELSE b.category01_name || '/' || b.category02_name || '/' || b.category03_name
                    END AS motive01,
                    CASE
                        WHEN a.motive02 LIKE '%B2B(기업)%' OR a.motive02 LIKE '%B2B(군인)%'
                            THEN a.motive02
                        ELSE b.category01_name || '/' || b.category02_name || '/' || b.category03_name
                    END AS motive02,
                    a.recommender01,
                    a.cust_num
                FROM raw.raw_crm_motive_new01 a
                JOIN raw.raw_crm_motive_new02 b ON a.cust_num = b.cust_num
