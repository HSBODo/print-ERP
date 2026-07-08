package com.bviit.analytics.overall.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 검사자 종합표 — 월 단위 단일 행.
 *
 * 주별(월~일, 월 경계 클립)의 월 롤업으로 정의된다. 주 데이터가 이미 월 경계에서 잘려
 * 각 달로 귀속되므로 월 합계 = 그 달 주 합계로 정확히 일치한다.
 *
 * 24·25 는 프론트 하드코딩(레거시 엑셀 마감값)이 유일한 진실이며 마트에 시드되지 않는다.
 * 배치는 batch.mart.min-year(=2026) 가드로 26년부터만 upsert하며, API도 26년 이후만 반환한다.
 *
 * 파생 칼럼(예약률·비율·성공률 등)은 프론트에서 아래 원시 값으로 계산한다.
 * 정의: docs/db/지표정의.md §6 / §1.3~1.10
 */
@Getter
@Builder
@Jacksonized
public class OverallExamMonthlyItem {
    private final int year;
    private final int month;
    private final boolean partial; // 현재 진행 중인 월(부분 집계)

    private final int totalExam;       // idx0  총검사자
    private final int introGeneral;    // idx1  소개유형 일반
    private final int introCustomer;   // idx2  소개유형 고객소개
    private final int introStaff;      // idx3  소개유형 직원소개
    private final int jobOffice;       // idx4  직업 직장인
    private final int jobStudent;      // idx5  직업 학생
    private final int jobEtc;          // idx6  직업 기타
    private final int visionBooked;    // idx7  시력교정 수술예약
    private final int cataractTotal;   // idx9  백내장 전체(노안포함)
    private final int cataractOnly;    // idx10 백내장 만
    private final int cataractBooked;  // idx12 백내장 예약
    private final int stopCount;       // idx15 중단수
    private final int visionExam;      // idx17 검사건수 시력교정
    private final int dreamlens;       // idx18 검사건수 드림렌즈
    private final int oneDay;          // idx28 원데이
    private final int oneDayBooked;    // idx29 원데이예약
}
