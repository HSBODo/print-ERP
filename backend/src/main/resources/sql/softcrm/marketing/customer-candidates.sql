SELECT RTRIM(c.CUST_NUM) AS customerNo,
       RTRIM(ISNULL(c.CUST_NAME, '')) AS name,
       ISNULL(c.BIRTH_DAY, '') AS birthDate,
       ISNULL(c.CALL_NUM2, '') AS contact,
       ISNULL(c.EMAIL, '') AS email
FROM CUSTOM c WITH(NOLOCK)
WHERE %s
