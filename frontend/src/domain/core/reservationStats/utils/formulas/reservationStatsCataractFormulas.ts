import type { CataractStatsDailyCounts } from '../../type/api'
import { pctInt } from '../reservationStatsCore'

export type CataractStatsCounts = Omit<CataractStatsDailyCounts, 'date'>

/** 채널별 한 행(채널 블록 — 종합 제외). 키 순서가 표 컬럼 순서와 일치한다. */
export interface CataractChannelRow {
  label: string
  // 총 예약(아웃바운드 포함)
  totalCataract: number // 백내장
  totalPresbyopia: number // 노안
  totalSum: number // 합계(= 백내장 + 노안)
  // 인바운드(컨택센터)
  inboundCall: number // 총 인입콜
  answeredCall: number // 응대콜
  answerRate: number // 응대율(%)
  newExamInquiry: number // 총 신규검사문의
  newReInquiry: number // 신규 재문의
  reInquiryRate: number // 재문의 비율(%)
  newPatient: number // ★신환
  inboundReservationRate: number // 예약율(%) = 신환/신규검사문의
  // 아웃바운드(TM)
  tmTotalDb: number // 총 DB
  tmValidDb: number // 유효 DB
  tmReservation: number // 예약수
  tmTotalDbRate: number // 총 DB 예약율(%)
  tmValidDbRate: number // 유효 DB 예약율(%)
  tmOutboundReservation: number // 아웃바운드 총 예약수(= TM 예약수)
  // 채팅(카카오톡)
  kakaoTotalInquiry: number // 총문의(모든)
  kakaoCataractReservation: number // 백내장 검사예약
  kakaoPresbyopiaReservation: number // 노안 검사예약
  // 온라인예약
  onlineReservation: number // 예약수
  onlineNoShow: number // 부도수
  // 취소
  cancelOnline: number // 온라인
  cancelCrm: number // 컨택센터 현장(CRM)
  cancelKakao: number // 카톡
}

// 백내장 총예약 = ★신환 + TM 예약수 + 카톡 백내장 검사예약 + 온라인 예약수 (채널 예약 합)
const cataractTotal = (counts: CataractStatsCounts): number =>
  counts.newPatient + counts.tmReservation + counts.kakaoCataractReservation + counts.onlineReservation

export const computeCataractChannelRow = (
  counts: CataractStatsCounts,
  label: string,
): CataractChannelRow => ({
  label,
  totalCataract: cataractTotal(counts),
  totalPresbyopia: counts.totalPresbyopia,
  totalSum: cataractTotal(counts) + counts.totalPresbyopia,
  inboundCall: counts.inboundCall,
  answeredCall: counts.answeredCall,
  answerRate: pctInt(counts.answeredCall, counts.inboundCall),
  newExamInquiry: counts.newExamInquiry,
  newReInquiry: counts.newReInquiry,
  reInquiryRate: pctInt(counts.newReInquiry, counts.newExamInquiry),
  newPatient: counts.newPatient,
  inboundReservationRate: pctInt(counts.newPatient, counts.newExamInquiry),
  tmTotalDb: counts.tmTotalDb,
  tmValidDb: counts.tmValidDb,
  tmReservation: counts.tmReservation,
  tmTotalDbRate: pctInt(counts.tmReservation, counts.tmTotalDb),
  tmValidDbRate: pctInt(counts.tmReservation, counts.tmValidDb),
  tmOutboundReservation: counts.tmReservation,
  kakaoTotalInquiry: counts.kakaoTotalInquiry,
  kakaoCataractReservation: counts.kakaoCataractReservation,
  kakaoPresbyopiaReservation: counts.kakaoPresbyopiaReservation,
  onlineReservation: counts.onlineReservation,
  onlineNoShow: counts.onlineNoShow,
  cancelOnline: counts.cancelOnline,
  cancelCrm: counts.cancelCrm,
  cancelKakao: counts.cancelKakao,
})
