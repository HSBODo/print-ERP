from datetime import datetime, timedelta

import pandas as pd
import pandera.pandas as pa
from pandera.typing import DataFrame, Series

from src.common.connections import get_crm_conn, get_db_conn


class NonReservationSchema(pa.DataFrameModel):
    """비예약 고객 목록 output 스키마."""

    CUST_NUM: Series[str]
    CUST_NAME: Series[str]
    EXAM_DATE: Series[str]
    RESERVE_DATE: Series[str]
    BIRTH_DAY: Series[str]
    CALL_NUM2: Series[str]
    EMAIL: Series[str]

    class Config:
        strict = False


class NonReservationForSheetSchema(pa.DataFrameModel):
    """비예약 고객 목록 (시트 적재용) output 스키마."""

    CUST_NUM: Series[int]
    CUST_NAME: Series[str]
    EXAM_DATE: Series[str]
    RESERVE_DATE: Series[str]
    BIRTH_DAY: Series[str]
    CALL_NUM2: Series[int]
    EMAIL: Series[str]
    생성일: Series[str]

    class Config:
        strict = False


def _run_sql(conn, sql: str, params=None) -> pd.DataFrame:
    cursor = conn.cursor()
    cursor.execute(sql, params or [])
    rows = cursor.fetchall()
    if not rows:
        columns = [d[0] for d in cursor.description] if cursor.description else []
        return pd.DataFrame(columns=columns)
    columns = [d[0] for d in cursor.description]
    return pd.DataFrame.from_records(rows, columns=columns)


def get_non_reservation_result() -> DataFrame[NonReservationSchema]:
    """비예약 고객 목록. 스키마: CUST_NUM, CUST_NAME, EXAM_DATE, RESERVE_DATE, BIRTH_DAY, CALL_NUM2, EMAIL."""
    sql = """;WITH RecentReservations AS (
                SELECT
                    r1.CUST_NUM,
                    r1.CUST_NAME,
                    r1.CUST_ENAME,
                    r1.RESERVE_DATE,
                    r1.RESERVE_JINRYO,
                    ROW_NUMBER() OVER (PARTITION BY r1.CUST_NUM ORDER BY r1.RESERVE_DATE DESC) AS rn
                FROM
                    RESERVATION r1
            )
            SELECT
                e.CUST_NUM,
                rr.CUST_NAME,
                e.EXAM_DATE,
                rr.RESERVE_DATE,
                c.BIRTH_DAY,
                c.CALL_NUM2,
                c.EMAIL
            FROM
                EXAM e
            LEFT JOIN
                RecentReservations rr ON e.CUST_NUM = rr.CUST_NUM AND rr.rn = 1
            LEFT JOIN
                CUSTOM c ON e.CUST_NUM = c.CUST_NUM
            LEFT JOIN
                AssignList_New aln ON e.CUST_NUM = aln.CustID
            WHERE
                NOT EXISTS (
                    SELECT 1
                    FROM RESERVATION r
                    WHERE r.CUST_NUM = e.CUST_NUM
                    AND (r.RESERVE_FLAG = 'O' OR r.RESERVE_FLAG = 'H' OR r.RESERVE_FLAG = 'D')
                ) -- 수술 예약이 없는 경우(백내장도 아닌 경우)
            AND
                aln.CounselorID != 'BS0808' -- BS 미지정
            AND
                e.EXAM_DATE >= CONVERT(VARCHAR, DATEADD(DAY, -14, GETDATE()), 23)
            AND
                e.STOP_YN = 'N' -- 검사 중단 구분 N
            AND
                (
                    rr.RESERVE_JINRYO = '5' -- 검사OP
                    OR rr.RESERVE_JINRYO = '7' -- 검사OP(Re)
                    OR rr.RESERVE_JINRYO = '' -- 검사
                    OR rr.RESERVE_JINRYO = '2' -- 재검사
                    OR rr.RESERVE_JINRYO = '16' -- 당일재검사
                ) -- 검사 구분
            AND
                c.BIRTH_DAY >= DATEADD(YEAR, -40, GETDATE()) -- 만 40세 이상
            AND
                c.BIRTH_DAY <= DATEADD(YEAR, -19, GETDATE()) -- 만 19세 이상
            AND e.EXAM_DATE >= rr.reserve_date -- 재검 예약이 있는경우 제
        """
    with get_db_conn(get_crm_conn()) as conn:
        df = _run_sql(conn, sql, None)
        return NonReservationSchema.validate(df)


# 비예약 시트용: run_date 기준 기간 필터 (run_date - 14일 ~ run_date)
_NON_RESERVATION_FOR_SHEET_SQL = """
;WITH RecentReservations AS (
    SELECT
        r1.CUST_NUM,
        r1.CUST_NAME,
        r1.CUST_ENAME,
        r1.RESERVE_DATE,
        r1.RESERVE_JINRYO,
        ROW_NUMBER() OVER (PARTITION BY r1.CUST_NUM ORDER BY r1.RESERVE_DATE DESC) AS rn
    FROM RESERVATION r1
)
SELECT
    e.CUST_NUM,
    rr.CUST_NAME,
    e.EXAM_DATE,
    rr.RESERVE_DATE,
    c.BIRTH_DAY,
    c.CALL_NUM2,
    c.EMAIL
FROM EXAM e
LEFT JOIN RecentReservations rr ON e.CUST_NUM = rr.CUST_NUM AND rr.rn = 1
LEFT JOIN CUSTOM c ON e.CUST_NUM = c.CUST_NUM
LEFT JOIN AssignList_New aln ON e.CUST_NUM = aln.CustID
WHERE NOT EXISTS (
    SELECT 1 FROM RESERVATION r
    WHERE r.CUST_NUM = e.CUST_NUM
    AND (r.RESERVE_FLAG = 'O' OR r.RESERVE_FLAG = 'H' OR r.RESERVE_FLAG = 'D')
)
AND aln.CounselorID != 'BS0808'
AND e.EXAM_DATE >= ? AND e.EXAM_DATE <= ?
AND e.STOP_YN = 'N'
AND (
    rr.RESERVE_JINRYO = '5' OR rr.RESERVE_JINRYO = '7' OR rr.RESERVE_JINRYO = ''
    OR rr.RESERVE_JINRYO = '2' OR rr.RESERVE_JINRYO = '16'
)
AND c.BIRTH_DAY >= DATEADD(YEAR, -40, GETDATE())
AND c.BIRTH_DAY <= DATEADD(YEAR, -19, GETDATE())
AND e.EXAM_DATE >= rr.reserve_date
"""


def get_non_reservation_for_sheet_result(
    run_date: datetime,
) -> DataFrame[NonReservationForSheetSchema]:
    """비예약 고객 목록 (시트 적재용). run_date 기준 14일 구간. CUST_NUM/CALL_NUM2는 int."""
    start_date = (run_date - timedelta(days=14)).strftime("%Y-%m-%d")
    end_date = run_date.strftime("%Y-%m-%d")
    with get_db_conn(get_crm_conn()) as conn:
        df = _run_sql(conn, _NON_RESERVATION_FOR_SHEET_SQL, [start_date, end_date])
    df["생성일"] = run_date.strftime("%Y-%m-%d")
    df["CUST_NUM"] = df["CUST_NUM"].astype(int)
    df["CALL_NUM2"] = df["CALL_NUM2"].astype(int)
    return NonReservationForSheetSchema.validate(df)