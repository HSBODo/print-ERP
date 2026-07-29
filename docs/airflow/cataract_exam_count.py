from datetime import date, datetime, timedelta
from typing import Union

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn
from src.utils import to_date


class DailyCataractExamCountSchema(pa.DataFrameModel):
    """백내장 일일 검사 건수 output 스키마."""

    row_count: Series[int]

    class Config:
        strict = False


def get_daily_cataract_exam_count_result(
    data_interval_end: Union[str, datetime, date], days_ago: int
) -> DataFrame[DailyCataractExamCountSchema]:
    """백내장 일일 검사 건수. 스키마: row_count (1행)."""
    target = (to_date(data_interval_end) - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    sql = """
            SELECT COUNT(*) AS row_count
            FROM (
                SELECT DISTINCT
                    A.RESERVE_DATE,
                    A.CUST_NUM,
                    A.CUST_NAME,
                    CASE
                        WHEN A.RESERVE_JINRYO = '1' THEN 'C_일반검사'
                        WHEN A.RESERVE_JINRYO = '2' THEN 'C_OP전검사'
                        WHEN A.RESERVE_JINRYO = '3' THEN 'C_재검사'
                        WHEN A.RESERVE_JINRYO = '7' THEN 'C_원데이'
                        WHEN A.RESERVE_JINRYO = '10' THEN '단_OP전검사'
                        WHEN A.RESERVE_JINRYO = '12' THEN '외_OP전검사'
                        WHEN A.RESERVE_JINRYO = '13' THEN '수술당일'
                        WHEN A.RESERVE_JINRYO = '25' THEN '렌즈삽입_원데이'
                        ELSE ''
                    END AS 진료구분
                FROM RESERVATION A
                INNER JOIN CUSTOM B ON B.CUST_NUM = A.CUST_NUM
                WHERE
                    A.RESERVE_DATE = ?
                    AND A.RESERVE_FLAG = 'H'
                    AND A.RESERVE_JINRYO <> '3'
                    AND A.RESERVE_STATE <> 'C'
                    AND NOT (A.RESERVE_FLAG = 'H' AND A.RESERVE_SEQ = '3')
                    AND B.CUST_NUM <> '9999999999999'
            ) AS result;
        """
    with get_db_conn(get_crm_conn()) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, [target])
        rows = cursor.fetchall()
        if not rows:
            columns = [d[0] for d in cursor.description] if cursor.description else []
            return DailyCataractExamCountSchema.validate(pd.DataFrame(columns=columns))
        columns = [d[0] for d in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)
        return DailyCataractExamCountSchema.validate(df)