from datetime import timedelta

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn
from src.utils import to_date


class DailyCataractOperationCountSchema(pa.DataFrameModel):
    """백내장 일일 수술 건수 output 스키마."""

    row_count: Series[int]

    class Config:
        strict = False


def get_daily_cataract_operation_count_result(
    data_interval_end, days_ago: int
) -> DataFrame[DailyCataractOperationCountSchema]:
    """백내장 일일 수술 건수. 스키마: row_count (1행)."""
    target = to_date(data_interval_end) - timedelta(days=days_ago)
    sql = """
                select count(*) AS row_count
                from(
                    SELECT reserve_num
                    FROM  RESERVATION R
                    WHERE RESERVE_FLAG = 'O'
                    AND RESERVE_STATE NOT IN ('C')
                    AND RESERVE_DATE = ?
                    AND CUST_NUM <> '8888888888888'
                    AND RESERVE_JINRYO IN (4) --백내장
                    AND LOWER(CUST_NAME) NOT LIKE '%test%'
                    AND CUST_NAME NOT LIKE '%테스트%'
                    AND LOWER(COMMENT) NOT LIKE '%IRRIGATION%'
                ) AS Subquery
        """
    with get_db_conn(get_crm_conn()) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, [target])
        rows = cursor.fetchall()
        if not rows:
            columns = [d[0] for d in cursor.description] if cursor.description else []
            return DailyCataractOperationCountSchema.validate(pd.DataFrame(columns=columns))
        columns = [d[0] for d in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)
        return DailyCataractOperationCountSchema.validate(df)