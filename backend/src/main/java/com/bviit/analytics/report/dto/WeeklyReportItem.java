package com.bviit.analytics.report.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 주차 레포트 한 행 — <b>ISO 8601 연간 주차</b>(월~일, 첫 목요일이 든 주 = 1주차) 단위 원시 집계.
 *
 * <p>월간 레포트와 같은 도표를 주차 축으로 보기 위한 값이다. 파생 지표(예약률·비율·중단율)는
 * 프론트에서 아래 원시 값으로 계산한다 — {@code OverallExamWeeklyItem} 과 같은 규약.
 *
 * <p><b>모두 운영 DB 라이브 집계다.</b> 월간 레포트의 2024·2025 는 레거시 확정값(마트 시드)이라
 * 월 단위로만 존재해 주로 쪼갤 수 없다. 그래서 주차 레포트는 전 구간을 라이브로 계산하며,
 * 같은 달이라도 월간 레포트 값과 미세하게 다를 수 있다(주간 검사자 종합지표와 동일한 성격).
 *
 * <p>값이 {@code null} 이면 "그 주에는 알 수 없음"(예: 홈페이지 소스 미연결 구간의 온라인 예약)이며,
 * 프론트는 선을 끊어 표시한다. 0 과 구분해야 하므로 {@code Integer} 다.
 */
@Getter
@Builder
@Jacksonized
public class WeeklyReportItem {

    /** ISO 주차연도 — 1주차가 전년 12월을 물어도 이 연도로 귀속된다. */
    private final int year;
    /** ISO 연간 주차 (1~53) */
    private final int week;
    /** 주 시작일(월요일) YYYY-MM-DD */
    private final String startDate;
    /** 주 종료일(일요일) YYYY-MM-DD */
    private final String endDate;

    /* ── 예약 (등록일 기준) ── */
    private final Integer reservations;  // 종합 = 콜 + 온라인
    private final Integer call;          // 콜 (CTI·CRM)
    private final Integer online;        // 온라인 — 2026-06 컷오버 전후 정의가 다르다(서비스 주석 참고)

    /* ── 검사 유입 (총검사자 = EXAM + Cataract_Exam) ── */
    private final Integer introGeneral;   // 일반 고객 검사 (소개 제외)
    private final Integer introCustomer;  // 고객소개 검사
    private final Integer introStaff;     // 직원소개 검사
    private final Integer jobOffice;      // 직장인 검사
    private final Integer jobStudent;     // 학생 검사
    private final Integer jobEtc;         // 기타 검사

    /* ── 검사수 ── */
    private final Integer examTotal;    // 검사수 = EXAM 행 + Cataract_Exam 세션
    private final Integer visionExam;   // 시력교정 검사 (검사자)
    private final Integer cataractExam; // 백내장 검사수 (RESERVATION H 기준, 사람)
    private final Integer oneDay;       // 원데이 검사 (검사OP M/5)

    /* ── 비율 계산용 원시값 (분자/분모) ── */
    private final Integer visionBooked;      // 시력교정 예약률 분자 (분모 = visionExam)
    private final Integer cataractExamEyes;  // 백내장 예약률 분모 (추천 눈 수)
    private final Integer cataractBooked;    // 백내장 예약률 분자
    private final Integer oneDayBooked;      // 원데이 예약률 분자 (분모 = oneDay)
    private final Integer stopCount;         // 중단율 분자 (분모 = visionExam)
    private final Integer examGeneralBase;   // 시력교정 일반예약률 분모 (원데이 아닌 검사)
    private final Integer bookedGeneral;     // 시력교정 일반예약률 분자

    /* ── 수술 (수술일 기준) ── */
    private final Integer visionSurgery;
    private final Integer cataractSurgery;
    private final Integer totalSurgery;   // 시력교정 + 백내장 + 재수술(레코드)

    /* ── 외래 ── */
    private final Integer outpatient;
}
