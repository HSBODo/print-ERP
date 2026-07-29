from datetime import date, datetime, timedelta
from typing import Union

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn
from src.utils import to_date


class DailyRevenueSchema(pa.DataFrameModel):
    """시력교정 일일 매출 output 스키마."""

    revenue: Series[float]

    class Config:
        strict = False


def get_daily_revenue_result(
    data_interval_end: Union[str, datetime, date], days_ago: int
) -> DataFrame[DailyRevenueSchema]:
    """시력교정 일일 매출. 스키마: revenue (1행)."""
    target = to_date(data_interval_end) - timedelta(days=days_ago)
    sql = """
            SELECT SUM(CONVERT(float, c.COST_PRICE)) AS revenue
            FROM OPERATIONDATA a
            LEFT JOIN COSTPRICE c ON c.CUST_NUM = a.CUST_NUM AND c.COST_DATE = a.OPERATION_DATE
            LEFT JOIN CUSTOM CU ON a.CUST_NUM = cu.CUST_NUM
            WHERE a.OPERATION_DATE = ?
            AND a.CUST_NUM NOT IN(
                SELECT DISTINCT CUST_NUM
                FROM Cataract_Operationdata
            )
            AND (cu.CUST_NAME not like '%TEST%' AND cu.CUST_NAME not like '%테스트%')
        """
    with get_db_conn(get_crm_conn()) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, [target])
        rows = cursor.fetchall()
        if not rows:
            columns = [d[0] for d in cursor.description] if cursor.description else []
            return DailyRevenueSchema.validate(pd.DataFrame(columns=columns))
        columns = [d[0] for d in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)
        # SUM() returns NULL when no rows or all nulls → treat as 0
        df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0.0)
        return DailyRevenueSchema.validate(df)