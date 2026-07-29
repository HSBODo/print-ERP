from datetime import date, datetime, timedelta
from typing import Union

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn
from src.utils import to_date


class DailyOperationCountSchema(pa.DataFrameModel):
    """시력교정 일일 수술 건수 output 스키마."""

    row_count: Series[int]

    class Config:
        strict = False


def get_daily_operation_count_result(
    data_interval_end: Union[str, datetime, date], days_ago: int
) -> DataFrame[DailyOperationCountSchema]:
    """시력교정 일일 수술 건수. 스키마: row_count (1행)."""
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
                AND RESERVE_JINRYO IN (1,2,8) -- 예약종류 수술, 당일OP, 노안수술,
                AND LOWER(CUST_NAME) NOT LIKE '%test%'
                AND CUST_NAME NOT LIKE '%테스트%'
                AND LOWER(COMMENT) NOT LIKE '%IRRIGATION%'-- 예약종류 : 수술, 진료구분 : 재수술로 안되어있는 항목 예외 처리
            ) AS Subquery
        """
    with get_db_conn(get_crm_conn()) as conn:
        cursor = conn.cursor()
        cursor.execute(sql, [target])
        rows = cursor.fetchall()
        if not rows:
            columns = [d[0] for d in cursor.description] if cursor.description else []
            return DailyOperationCountSchema.validate(pd.DataFrame(columns=columns))
        columns = [d[0] for d in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)
        return DailyOperationCountSchema.validate(df)