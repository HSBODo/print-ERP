from datetime import date, datetime, timedelta
from typing import Union

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn
from src.utils import to_date


class DailyExamCountSchema(pa.DataFrameModel):
    """시력교정 일일 검사 건수 output 스키마."""

    row_count: Series[int]

    class Config:
        strict = False


def get_daily_exam_count_result(
    data_interval_end: Union[str, datetime, date], days_ago: int
) -> DataFrame[DailyExamCountSchema]:
    """시력교정 일일 검사 건수. 스키마: row_count (1행)."""
    target = to_date(data_interval_end) - timedelta(days=days_ago)
    sql = """
            SELECT COUNT(*) AS row_count
            FROM (
                SELECT DISTINCT
                    e.EXAM_DATE AS [검사일자],
                    e.CUST_NUM   AS [차트번호],
                    c.cust_name  AS [고객명],
                    e.CANCEL_CD,
                    CASE WHEN R.RESERVE_STATE='I' THEN '내원' ELSE '귀가' END AS 예약상태
                FROM RESERVATION R
                JOIN EXAM   E ON R.CUST_NUM = E.CUST_NUM
                JOIN CUSTOM C ON R.CUST_NUM = C.CUST_NUM
                WHERE CAST(E.EXAM_DATE AS date) = ?
                AND R.RESERVE_FLAG = 'm'
                AND R.RESERVE_STATE IN ('I','H')
                AND NOT (E.CUST_NUM IN ('9999999999999','8888888888888'))
            ) AS result;
        """
    with get_db_conn(get_crm_conn()) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, [target])
        rows = cursor.fetchall()
        if not rows:
            columns = (
                [d[0] for d in cursor.description] if cursor.description else []
            )
            return DailyExamCountSchema.validate(pd.DataFrame(columns=columns))
        columns = [d[0] for d in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)
        return DailyExamCountSchema.validate(df)