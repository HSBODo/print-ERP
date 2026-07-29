"""바이럴 마케팅 유입 고객 추적 관련 dataloader 함수."""
import logging
import re
from pathlib import Path

import pandas as pd

from src.common.connections import get_crm_conn
from src.sheet.repository import GoogleSheetRepository

logger = logging.getLogger(__name__)

SQL_DIR_CUSTOMER = Path(__file__).resolve().parents[2] / "sqls" / "customer"
SQL_DIR_REFERRAL = Path(__file__).resolve().parents[2] / "sqls" / "referral"


def extract_virtual_account_master() -> pd.DataFrame:
    """CRM에서 가상계정 목록 추출 후 반환."""
    sql = (SQL_DIR_CUSTOMER / "extract_virtual_account_customers.sql").read_text("utf-8")

    with get_crm_conn() as conn:
        raw_data = pd.read_sql(sql, conn)

    raw_data["가상_차트번호"] = raw_data["가상_차트번호"].str.strip()
    return raw_data


def extract_virtual_account_referrals() -> pd.DataFrame:
    """가상계정이 소개한 고객의 검사/수술/매출 데이터 추출 후 반환."""
    sql_exam = (SQL_DIR_REFERRAL / "extract_virtual_account_referrals_exam.sql").read_text("utf-8")
    sql_operation = (SQL_DIR_REFERRAL / "extract_virtual_account_referrals_operation.sql").read_text("utf-8")

    with get_crm_conn() as conn:
        data_dict = {"exam": pd.read_sql(sql_exam, conn), "operation": pd.read_sql(sql_operation, conn)}

    referral_data = pd.concat(
        [data_dict["operation"], data_dict["exam"]], ignore_index=True
    )
    referral_data = referral_data.sort_values(by="날짜").reset_index(drop=True)

    string_columns = ["고객_차트번호", "고객_이름", "가상_차트번호", "가상_이름", "구분", "수술_좌안", "수술_우안"]
    for col in string_columns:
        if col in referral_data.columns:
            referral_data[col] = referral_data[col].astype(str).str.strip()

    referral_data["매출"] = referral_data["매출"].fillna(0).astype(int)
    return referral_data


def extract_review_participant_referrals(
    gs_repo: GoogleSheetRepository,
    spreadsheet_id: str,
) -> pd.DataFrame:
    """후기참여자 → CRM 매칭 → 소개 고객 검사/수술/매출 데이터 추출 후 반환.

    후기참여자 목록은 Google Sheets '후기참여' 시트에서 읽음.
    """
    # 1. Google Sheets '후기참여' 시트에서 참여자 목록 읽기
    df = gs_repo.read_dataframe(
        spreadsheet_id=spreadsheet_id,
        worksheet_name="후기참여",
        header_row=2,
    )
    df["전화번호"] = df["전화번호"].apply(
        lambda x: re.sub(r"[^0-9]", "", str(x)) if pd.notna(x) else ""
    )

    # 2. CRM CUSTOM 테이블과 이름 + 전화번호로 매칭
    with get_crm_conn() as conn:
        customer_df = pd.read_sql(
            "SELECT CUST_NUM, CUST_NAME, CALL_NUM2 FROM CUSTOM", conn
        )
    customer_df["CALL_NUM2"] = customer_df["CALL_NUM2"].apply(
        lambda x: re.sub(r"[^0-9]", "", str(x)) if pd.notna(x) else ""
    )
    matched = df.merge(
        customer_df,
        left_on=["이름", "전화번호"],
        right_on=["CUST_NAME", "CALL_NUM2"],
        how="left",
    ).dropna(subset=["CUST_NUM"])

    if matched.empty:
        logger.warning("매칭된 후기참여자가 없습니다.")
        return pd.DataFrame()

    # 3. SQL 템플릿에 후기참여자 ID 주입
    ids_str = ", ".join([f"'{i}'" for i in matched["CUST_NUM"].str.strip().tolist()])

    sql_exam = (SQL_DIR_REFERRAL / "extract_review_participant_referrals_exam.sql").read_text("utf-8")
    sql_operation = (SQL_DIR_REFERRAL / "extract_review_participant_referrals_operation.sql").read_text("utf-8")
    sql_exam = sql_exam.replace("{{ review_participant_ids }}", ids_str)
    sql_operation = sql_operation.replace("{{ review_participant_ids }}", ids_str)

    # 4. CRM에서 유입 데이터 추출
    with get_crm_conn() as conn:
        exam_data = pd.read_sql(sql_exam, conn)
        operation_data = pd.read_sql(sql_operation, conn)

    # 5. 전처리
    referral_data = pd.concat([exam_data, operation_data], ignore_index=True)
    referral_data = referral_data.sort_values(by="날짜").reset_index(drop=True)

    string_columns = ["고객_차트번호", "고객_이름", "리뷰_고객번호", "리뷰_이름", "구분", "수술_좌안", "수술_우안"]
    for col in string_columns:
        if col in referral_data.columns:
            referral_data[col] = referral_data[col].astype(str).str.strip()

    referral_data["매출"] = referral_data["매출"].fillna(0).astype(int)
    return referral_data


def extract_daum_cafe_referrals() -> pd.DataFrame:
    """다음카페(여성시대) 바이럴 유입 고객 데이터 추출 후 반환."""
    sql_exam = (SQL_DIR_REFERRAL / "extract_daum_cafe_referrals_exam.sql").read_text("utf-8")
    sql_operation = (SQL_DIR_REFERRAL / "extract_daum_cafe_referrals_operation.sql").read_text("utf-8")

    with get_crm_conn() as conn:
        data_dict = {"exam": pd.read_sql(sql_exam, conn), "operation": pd.read_sql(sql_operation, conn)}

    referral_data = pd.concat(
        [data_dict["operation"], data_dict["exam"]], ignore_index=True
    )
    referral_data = referral_data.sort_values(by="날짜").reset_index(drop=True)

    string_columns = ["고객_차트번호", "고객_이름", "가상_차트번호", "가상_이름", "구분", "수술_좌안", "수술_우안"]
    for col in string_columns:
        if col in referral_data.columns:
            referral_data[col] = referral_data[col].astype(str).str.strip()

    referral_data["매출"] = referral_data["매출"].fillna(0).astype(int)
    return referral_data