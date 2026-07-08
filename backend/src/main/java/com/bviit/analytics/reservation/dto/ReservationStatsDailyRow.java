package com.bviit.analytics.reservation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * 예약통계시스템(BCRM RSS 컨택통계) 일자별 원시 카운트 1행.
 *
 * 운영 BCRM RSS 쿼리의 내부 집계(Z.CH01~CH24)를 그대로 노출한다. 비율·총예약 등 파생값은
 * 프론트가 집계(일→주→월) 후 동일 공식으로 계산하므로 여기서는 원시 카운트만 담는다.
 * 채널 원천: CtiRptLst·DB_CUSTOM·DB_ReCounsel·RESERVATION/RESERVE_HISTORY·RESERVATION_NAVER·
 * HappyTalk·EICN_MySQL(OPENQUERY 인입/응대콜).
 *
 * manualEdits: 셀 수기 보정 이력(없으면 직렬화 생략). 홈/네이버 온라인예약 카운트를 손보정하면 남는다.
 */
public record ReservationStatsDailyRow(
        String date,             // 예약(등록)일 yyyy-MM-dd
        int inboundCall,         // CH01 검사 인입콜 (EICN)
        int answeredCall,        // CH02 검사 응대콜 (EICN)
        int newInquiry,          // CH03 검사 신규예약문의
        int callReservation,     // CH04 검사 예약수
        int tmTotalDb,           // CH05 TM 총DB
        int tmValidDb,           // CH06 TM 유효DB
        int tmReservation,       // CH07 TM 예약수
        int tmRecounsel,         // CH08 TM 재상담
        int tmRecounselValid,    // CH09 TM 재상담 유효수
        int tmRecounselReservation, // CH10 TM 재상담 예약수
        int homeReceived,        // CH11 홈페이지 예약접수
        int homeReservation,     // CH12 홈페이지 예약수
        int naverReceived,       // CH13 네이버 예약접수(RESERVATION 등록일 카운트)
        int naverRejected,       // CH14 네이버 파트너거절(RESERVATION_NAVER, RsvNum 없는 확정전 취소)
        int naverValid,          // CH15 네이버 유효접수(접수-거절) — 일별은 접수0인 날 음수 가능, 프론트가 표시 시 0 클램프
        int naverReservation,    // CH16 네이버 예약수(유효-사용자취소(네이버취소))
        int kakaoInquiry,        // CH17 카카오톡 문의
        int kakaoReservation,    // CH18 카카오톡 예약수
        int cancelCallNaver,     // CH19 취소 콜·네이버
        int cancelHome,          // CH20 취소 홈페이지
        int cancelKakao,         // CH21 취소 카톡
        int visit,               // CH22 내원
        int noShowReservation,   // CH23 예약(부도)
        int cancel,              // CH24 취소
        // 수기 보정 이력(비어있으면 JSON 직렬화 생략) — 이 일자에서 손보정한 셀 목록
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<ReservationStatsCellEdit> manualEdits
) {

    public ReservationStatsDailyRow {
        manualEdits = manualEdits == null ? List.of() : List.copyOf(manualEdits);
    }

    /** 라이브 조회/기존 코드용 — 수기 보정 이력 없이 생성. */
    public ReservationStatsDailyRow(
            String date,
            int inboundCall, int answeredCall, int newInquiry, int callReservation,
            int tmTotalDb, int tmValidDb, int tmReservation,
            int tmRecounsel, int tmRecounselValid, int tmRecounselReservation,
            int homeReceived, int homeReservation,
            int naverReceived, int naverRejected, int naverValid, int naverReservation,
            int kakaoInquiry, int kakaoReservation,
            int cancelCallNaver, int cancelHome, int cancelKakao,
            int visit, int noShowReservation, int cancel
    ) {
        this(date, inboundCall, answeredCall, newInquiry, callReservation,
                tmTotalDb, tmValidDb, tmReservation,
                tmRecounsel, tmRecounselValid, tmRecounselReservation,
                homeReceived, homeReservation,
                naverReceived, naverRejected, naverValid, naverReservation,
                kakaoInquiry, kakaoReservation,
                cancelCallNaver, cancelHome, cancelKakao,
                visit, noShowReservation, cancel, List.of());
    }
}
