from datetime import timedelta

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn
from src.utils import to_date


class DailyCataractRevenueSchema(pa.DataFrameModel):
    """백내장 일일 매출 output 스키마."""

    revenue: Series[float]

    class Config:
        strict = False


def get_daily_cataract_revenue_result(
    data_interval_end, days_ago: int
) -> DataFrame[DailyCataractRevenueSchema]:
    """백내장 일일 매출. 스키마: revenue (1행)."""
    target = to_date(data_interval_end) - timedelta(days=days_ago)
    sql = """
            SELECT SUM(CONVERT(float, c.COST_PRICE)) AS revenue
            from Cataract_Operationdata co
            left join COSTPRICE c on c.CUST_NUM = co.CUST_NUM AND (c.COST_DATE = co.OPERATIONR_DATE or c.COST_DATE = co.OPERATIONL_DATE)
            left join custom cu on co.CUST_NUM = cu.CUST_NUM
            where c.COST_DATE = ?
            and (cu.CUST_NAME not like '%TEST%' and cu.CUST_NUM not like '%테스트%')
        """
    with get_db_conn(get_crm_conn()) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, [target])
        rows = cursor.fetchall()
        if not rows:
            columns = (
                [d[0] for d in cursor.description] if cursor.description else []
            )
            return DailyCataractRevenueSchema.validate(
                pd.DataFrame(columns=columns)
            )
        columns = [d[0] for d in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)
        # SUM() returns NULL when no rows or all nulls → treat as 0
        df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0.0)
        return DailyCataractRevenueSchema.validate(df)