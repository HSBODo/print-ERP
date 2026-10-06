/**
 * 예약통계시스템 — 월간 채널별 예약 현황 집계/표시 로직.
 *
 * 콜(검사 인입콜·TM) / 온라인(홈페이지·네이버) / 채팅(카카오톡) / 취소 채널을 주차(週) 단위로
 * 분해한 회의자료용 종합표. 운영 라이브(getDisplayRowsFromCounts) 또는 확정 스냅샷으로 표시한다.
 * (퍼센트 값은 원본 산출식이 시점·분모가 달라 일부 100% 초과가 존재 — 원자료를 그대로 표기한다.)
 */

import type { ReservationStatsDailyCounts } from '../type/api'
import {
  type ChannelRow,
  computeSystemChannelRow,
  type SystemStatsCounts,
} from './formulas/reservationStatsSystemFormulas'
import {
  createCountHelpers,
  type Granularity,
  type RowTier,
} from './reservationStatsCore'
import { buildStatsCsv, type CsvColumnGroup } from './reservationStatsCsv'
import type { CellFormat } from './reservationStatsFormat'
import {
  buildDisplayRowsFromCounts,
  buildRangeDisplayRowsFromCounts,
  type StatsDisplayRow,
} from './reservationStatsRows'
import { computeSummaryRow, SUMMARY_COLUMNS } from './reservationStatsSummary'

export {
  GRANULARITIES,
  monthFullLabel,
  monthShortLabel,
} from './reservationStatsCore'
export type { Granularity, RowTier } from './reservationStatsCore'
export { SUMMARY_COLUMNS } from './reservationStatsSummary'
export type { CellFormat, SummaryFormat } from './reservationStatsFormat'
export type { SummaryColumnMeta, SummaryRow } from './reservationStatsSummary'
export type { ChannelRow } from './formulas/reservationStatsSystemFormulas'

/** 표 본문 컬럼 메타(총예약 이후). label은 헤더 3행에 그대로 노출. */
export interface ColumnMeta {
  key: keyof Omit<ChannelRow, 'label' | 'totalReservation'>
  label: string
  fmt: CellFormat
  /** 비율 강조 컬럼(빨강 글씨). */
  emphasis?: boolean
}

/** 콜(검사 인입콜 8 + TM 10) → 온라인(홈 3 + 네이버 5) → 채팅(카카오 3) → 취소(3) = 32컬럼. */
export const CHANNEL_COLUMNS: ColumnMeta[] = [
  // 콜 › 검사 인입콜
  { key: 'inboundCall', label: '인입콜', fmt: 'num' },
  { key: 'answeredCall', label: '응대콜', fmt: 'num' },
  { key: 'answerRate', label: '응대율', fmt: 'pct', emphasis: true },
  { key: 'newInquiry', label: '신규예약문의', fmt: 'num' },
  { key: 'newInquiryRate', label: '신규문의 비율', fmt: 'pct' },
  { key: 'callReservation', label: '예약수', fmt: 'num' },
  {
    key: 'reservationVsNewInquiry',
    label: '신규문의 대비 예약율',
    fmt: 'pct',
    emphasis: true,
  },
  { key: 'callReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 콜 › TM
  { key: 'tmTotalDb', label: '총 DB', fmt: 'num' },
  { key: 'tmValidDb', label: '유효 DB', fmt: 'num' },
  { key: 'tmReservation', label: '예약수', fmt: 'num' },
  { key: 'tmValidDbRate', label: '유효 DB 예약율', fmt: 'pct', emphasis: true },
  { key: 'tmReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  { key: 'tmRecounsel', label: '재상담', fmt: 'num' },
  {
    key: 'tmRecounselRatio',
    label: '총 DB 중 재상담비율',
    fmt: 'pct',
    emphasis: true,
  },
  { key: 'tmRecounselValid', label: '재상담 유효수', fmt: 'num' },
  { key: 'tmRecounselReservation', label: '예약수', fmt: 'num' },
  { key: 'tmRecounselRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 온라인 › 홈페이지
  { key: 'homeReceived', label: '예약접수', fmt: 'num' },
  { key: 'homeReservation', label: '예약수', fmt: 'num' },
  { key: 'homeReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 온라인 › 네이버
  { key: 'naverReceived', label: '예약접수', fmt: 'num' },
  { key: 'naverRejected', label: '파트너거절', fmt: 'num' },
  { key: 'naverValid', label: '유효접수', fmt: 'num' },
  { key: 'naverReservation', label: '예약수', fmt: 'num' },
  {
    key: 'naverValidRate',
    label: '유효접수 예약율',
    fmt: 'pct',
    emphasis: true,
  },
  { key: 'naverReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 채팅 › 카카오톡
  { key: 'kakaoInquiry', label: '문의', fmt: 'num' },
  { key: 'kakaoReservation', label: '예약수', fmt: 'num' },
  { key: 'kakaoReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 취소
  { key: 'cancelCallNaver', label: '콜·네이버', fmt: 'num' },
  { key: 'cancelHome', label: '홈페이지', fmt: 'num' },
  { key: 'cancelKakao', label: '카톡', fmt: 'num' },
]

const SYSTEM_CSV_COLUMN_GROUPS: CsvColumnGroup<ColumnMeta>[] = [
  { label: '콜>검사 인입콜', columns: CHANNEL_COLUMNS.slice(0, 8) },
  { label: '콜>TM', columns: CHANNEL_COLUMNS.slice(8, 18) },
  { label: '온라인>홈페이지', columns: CHANNEL_COLUMNS.slice(18, 21) },
  { label: '온라인>네이버', columns: CHANNEL_COLUMNS.slice(21, 27) },
  { label: '채팅>카카오톡', columns: CHANNEL_COLUMNS.slice(27, 30) },
  { label: '취소', columns: CHANNEL_COLUMNS.slice(30) },
]

/** 표 한 행에 채널 + 종합을 함께 담는다(두 블록을 한 줄로 병합). */
export type DisplayRow = StatsDisplayRow<ChannelRow>

/* ──────────────────────────────────────────────────────────────────────────
 * 실데이터(BCRM RSS) — 일자별 원시 카운트 → 표시 행 계산.
 * 카운트만 합산(일→주→월)하고 비율·총예약은 운영 쿼리와 동일 공식으로 재계산한다.
 *   D(예약율 분모) = 인입콜+TM총DB+TM재상담+홈예약+네이버예약+카톡예약 (CH01+CH05+CH08+CH12+CH16+CH18)
 *   총예약          = 검사예약+TM예약+TM재상담예약+홈예약+네이버예약+카톡예약 (CH04+CH07+CH10+CH12+CH16+CH18, 인입콜 제외)
 * ────────────────────────────────────────────────────────────────────────── */

type Counts = SystemStatsCounts

const COUNT_KEYS: (keyof Counts)[] = [
  'inboundCall',
  'answeredCall',
  'newInquiry',
  'callReservation',
  'tmTotalDb',
  'tmValidDb',
  'tmReservation',
  'tmRecounsel',
  'tmRecounselValid',
  'tmRecounselReservation',
  'homeReceived',
  'homeReservation',
  'naverReceived',
  'naverRejected',
  'naverValid',
  'naverReservation',
  'kakaoInquiry',
  'kakaoReservation',
  'cancelCallNaver',
  'cancelHome',
  'cancelKakao',
  'visit',
  'noShowReservation',
  'cancel',
]

const { zeroCounts, sumCounts, isZeroCounts } =
  createCountHelpers<Counts>(COUNT_KEYS)

const countRow = (
  c: Counts,
  label: string,
  tier: RowTier,
  extra: Partial<DisplayRow> = {},
): DisplayRow => ({
  label,
  tier,
  isTotal: tier === 'month',
  channel: computeSystemChannelRow(c, label),
  summary: computeSummaryRow(c, label),
  ...extra,
})

/**
 * 실데이터(일자별 카운트) → 조회 단위별 표시 행.
 * 일별은 선택 월 달력(1~lastDay)으로 채우고, 데이터 없는 날은 0(휴무 회색). 주/월은 카운트 합산 후 비율 재계산.
 */
export const getDisplayRowsFromCounts = (
  granularity: Granularity,
  dailies: ReservationStatsDailyCounts[],
  period: string,
  lastDay: number,
): DisplayRow[] =>
  buildDisplayRowsFromCounts(granularity, dailies, period, lastDay, {
    zeroCounts,
    sumCounts,
    isZeroCounts,
    buildRow: countRow,
  })

/**
 * 시작일/종료일 범위로 표시 행을 만든다. 여러 달을 걸쳐도 동작. 툴바에서 직접
 * 날짜를 지정한 경우에 사용. 단일 월 범위면 getDisplayRowsFromCounts 와 동일 결과.
 */
export const getRangeDisplayRowsFromCounts = (
  granularity: Granularity,
  dailies: ReservationStatsDailyCounts[],
  from: string,
  to: string,
): DisplayRow[] =>
  buildRangeDisplayRowsFromCounts(granularity, dailies, from, to, {
    zeroCounts,
    sumCounts,
    isZeroCounts,
    buildRow: countRow,
  })

/** 현재 조회 결과 행을 그대로 CSV 문자열로 직렬화(휴무일은 빈 칸). */
export const buildReservationStatsCsv = (rows: DisplayRow[]): string =>
  buildStatsCsv(rows, {
    leading: { header: '총예약', value: (row) => row.channel.totalReservation },
    columnGroups: SYSTEM_CSV_COLUMN_GROUPS,
    summaryColumns: SUMMARY_COLUMNS,
  })
