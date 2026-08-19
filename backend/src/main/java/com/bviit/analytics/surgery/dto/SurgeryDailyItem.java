package com.bviit.analytics.surgery.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 일별 수술 통계 단일 행 (환자/눈 수 기준, {@link SurgeryMonthlyItem}의 일자 단위 변형).
 *
 * 집계 기준·그룹·DISTINCT 규칙은 월별과 동일하며, year/month 대신 수술일(date, YYYY-MM-DD)을 키로 둔다.
 *
 * ⚠ 월별 서비스의 레거시 보정 상수(2024~2026 1~4월 시력교정 환자수 override)는 월 단위라
 * 일별에는 적용하지 않는다. 따라서 같은 달의 일별 합계가 월별 뷰의 보정치와 다를 수 있다(실측 기준).
 */
@Getter
@Builder
@Jacksonized
@JsonAutoDetect(
    fieldVisibility = Visibility.ANY,
    getterVisibility = Visibility.NONE,
    isGetterVisibility = Visibility.NONE
)
public class SurgeryDailyItem {
    private final String date;

    // 시력교정
    private final int lasek;
    private final int lasik;
    private final int smile;
    private final int smilePro;

    // 렌즈/각막
    private final int icl;
    private final int tIcl;
    private final int kpl;
    private final int tKpl;
    private final int viva;

    /** 노안 레이저(PRESBYOND) — 환자 수 DISTINCT. */
    private final int presbyond;

    /**
     * PIOL DISTINCT 환자 수. icl+tIcl+kpl+tKpl+viva 단순 합산과 다르다 —
     * 양안에 다른 렌즈를 넣은 환자가 유형별로 각각 잡히기 때문(2026-07: 합산 168 vs 실인원 148).
     * 비중 표의 'PIOL 합계'는 반드시 이 값을 쓴다.
     */
    private final int piolPatients;

    // 백내장
    private final int catMulti;
    private final int catMono;
    private final int catEdof;

    // 시력교정 부가시술 (add-on, 환자 수 DISTINCT)
    private final int xtra;
    private final int waveVision;
    private final int monoVision;
    private final int contra;
    private final int personal;

    // 라섹계 세부 (EYECLE 기준, 환자 수 DISTINCT)
    private final int lasekEx;
    private final int lasekRed;

    // 시력교정 재수술 (RE_OPERATION, 레코드(건) 단위)
    private final int reoperation;
    private final int reopLaser;
    private final int reopLens;

    // 그룹별 환자 수 (DISTINCT)
    private final int visionPatients;
    private final int cataractPatients;

    // 총 환자 수 (비중 계산용 분모)
    private final int total;
}
