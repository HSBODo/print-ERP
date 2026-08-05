package com.bviit.analytics.surgery.dto;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import lombok.Builder;
import lombok.Getter;

/**
 * 월별 수술 통계 단일 행 (환자 수 기준, 레거시 stats-weekly-report.js 준용).
 *
 * 모든 카운트는 COUNT(DISTINCT CUST_NUM) 기준 — 한 환자가 여러 유형 수술을 받으면
 * 각 유형에 중복 카운트됨 (예: SMILE R + LASIK L → smile+1, lasik+1).
 *
 * 그룹:
 *   refractive (시력교정): lasek, lasik, smile, smilePro
 *   lens (렌즈/각막):      icl, tIcl, kpl, tKpl, viva
 *   cataract (백내장):     catMulti, catMono, catEdof
 *
 * 총 환자 수:
 *   visionPatients   — OPERATIONDATA 기준 DISTINCT CUST_NUM (백내장 환자 제외)
 *   cataractPatients — Cataract_Operationdata 기준 DISTINCT CUST_NUM
 *   total            — visionPatients + cataractPatients (비중 계산용 분모)
 */
@Getter
@Builder
@JsonAutoDetect(
    fieldVisibility = Visibility.ANY,
    getterVisibility = Visibility.NONE,
    isGetterVisibility = Visibility.NONE
)
public class SurgeryMonthlyItem {
    private final int year;
    private final int month;

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

    // 시력교정 부가시술 (add-on, 환자 수 DISTINCT) — #27 상세표
    private final int xtra;        // 엑스트라 (OPERATIONR/L LIKE '%+X%')
    private final int waveVision;  // 웨이브비전 (LIKE '%W.V%')
    private final int monoVision;  // 모노비전 (LIKE 'MONO%')
    private final int contra;      // 콘트라 (LIKE '%CONT%')
    private final int personal;    // 퍼스널 (LIKE '%P.E%')

    // 라섹계 세부 (EYECLE 기준, 환자 수 DISTINCT) — #27 상세표
    private final int lasekEx;     // EX (EYECLE + EX500)
    private final int lasekRed;    // Red (EYECLE + RED)

    // 시력교정 재수술 (RE_OPERATION, 레코드(건) 단위) — #27 상세표 / Phase 2
    private final int reoperation; // 합계
    private final int reopLaser;   // 레이저 재교정 (각막)
    private final int reopLens;    // 렌즈 재수술 (remo/exch/IOL)

    // 그룹별 환자 수 (DISTINCT)
    private final int visionPatients;
    private final int cataractPatients;

    // 총 환자 수 (비중 계산용 분모)
    private final int total;
}
