/**
 * 예약통계_백내장 — 월간 채널별 예약 현황 시드/집계 로직.
 *
 * 백내장(노안 포함) 검사예약을 인바운드(컨택센터)·아웃바운드(TM)·채팅(카카오톡)·온라인·취소
 * 채널로 분해한 회의자료용 종합표. 시력교정(reservationStatsSystemData)과 동일한 운영 방식이되
 * 채널 구성이 달라 별도 스키마를 둔다.
 *
 * 운영 라이브(getDisplayRowsFromCounts) 또는 확정 스냅샷으로 표시한다.
 * 비율·합계·총예약건은 카운트 합산 후 동일 공식으로 재계산한다.
 */

import type { CataractStatsDailyCounts } from '../type/api'
import {
  type CataractChannelRow,
  type CataractStatsCounts,
  computeCataractChannelRow,
} from './formulas/reservationStatsCataractFormulas'
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
export type { SummaryRow } from './reservationStatsSummary'
export type { CataractChannelRow } from './formulas/reservationStatsCataractFormulas'

/** 표 본문 컬럼 메타(25컬럼). emphasis는 빨강 강조. */
export interface CataractColumnMeta {
  key: keyof Omit<CataractChannelRow, 'label'>
  label: string
  fmt: CellFormat
  emphasis?: boolean
}

/** 총예약(3) → 인바운드(8) → 아웃바운드(6) → 채팅(3) → 온라인예약(2) → 취소(3) = 25컬럼. */
export const CATARACT_COLUMNS: CataractColumnMeta[] = [
  // 총 예약(아웃바운드 포함)
  { key: 'totalCataract', label: '백내장', fmt: 'num' },
  { key: 'totalPresbyopia', label: '노안', fmt: 'num' },
  { key: 'totalSum', label: '합계', fmt: 'num' },
  // 인바운드(컨택센터)
  { key: 'inboundCall', label: '총 인입콜', fmt: 'num' },
  { key: 'answeredCall', label: '응대콜', fmt: 'num' },
  { key: 'answerRate', label: '응대율', fmt: 'pct', emphasis: true },
  { key: 'newExamInquiry', label: '총 신규검사문의', fmt: 'num' },
  { key: 'newReInquiry', label: '신규 재문의', fmt: 'num' },
  { key: 'reInquiryRate', label: '재문의 비율', fmt: 'pct', emphasis: true },
  { key: 'newPatient', label: '★신환', fmt: 'num' },
  {
    key: 'inboundReservationRate',
    label: '예약율',
    fmt: 'pct',
    emphasis: true,
  },
  // 아웃바운드(TM)
  { key: 'tmTotalDb', label: '총 DB', fmt: 'num' },
  { key: 'tmValidDb', label: '유효 DB', fmt: 'num' },
  { key: 'tmReservation', label: '예약수', fmt: 'num' },
  { key: 'tmTotalDbRate', label: '총 DB 예약율', fmt: 'pct', emphasis: true },
  { key: 'tmValidDbRate', label: '유효 DB 예약율', fmt: 'pct', emphasis: true },
  {
    key: 'tmOutboundReservation',
    label: '아웃바운드 총 예약수',
    fmt: 'num',
    emphasis: true,
  },
  // 채팅(카카오톡)
  { key: 'kakaoTotalInquiry', label: '총문의(모든)', fmt: 'num' },
  {
    key: 'kakaoCataractReservation',
    label: '백내장 검사예약',
    fmt: 'num',
    emphasis: true,
  },
  { key: 'kakaoPresbyopiaReservation', label: '노안 검사예약', fmt: 'num' },
  // 온라인예약
  { key: 'onlineReservation', label: '예약수', fmt: 'num' },
  { key: 'onlineNoShow', label: '부도수', fmt: 'num' },
  // 취소
  { key: 'cancelOnline', label: '온라인', fmt: 'num' },
  { key: 'cancelCrm', label: '컨택센터 현장(CRM)', fmt: 'num' },
  { key: 'cancelKakao', label: '카톡', fmt: 'num' },
]

const CATARACT_CSV_COLUMN_GROUPS: CsvColumnGroup<CataractColumnMeta>[] = [
  { label: '총예약', columns: CATARACT_COLUMNS.slice(0, 3) },
  { label: '인바운드(컨택센터)', columns: CATARACT_COLUMNS.slice(3, 11) },
  { label: '아웃바운드(TM)', columns: CATARACT_COLUMNS.slice(11, 17) },
  { label: '채팅(카카오톡)', columns: CATARACT_COLUMNS.slice(17, 20) },
  { label: '온라인예약', columns: CATARACT_COLUMNS.slice(20, 22) },
  { label: '취소', columns: CATARACT_COLUMNS.slice(22) },
]

/** 표 한 행 — 채널 + 종합. */
export type CataractDisplayRow = StatsDisplayRow<CataractChannelRow>

/* ── 카운트 집계/비율 재계산 ── */

type Counts = CataractStatsCounts

const COUNT_KEYS: (keyof Counts)[] = [
  'totalCataract',
  'totalPresbyopia',
  'inboundCall',
  'answeredCall',
  'newExamInquiry',
  'newReInquiry',
  'newPatient',
  'tmTotalDb',
  'tmValidDb',
  'tmReservation',
  'kakaoTotalInquiry',
  'kakaoCataractReservation',
  'kakaoPresbyopiaReservation',
  'onlineReservation',
  'onlineNoShow',
  'cancelOnline',
  'cancelCrm',
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
  extra: Partial<CataractDisplayRow> = {},
): CataractDisplayRow => ({
  label,
  tier,
  isTotal: tier === 'month',
  channel: computeCataractChannelRow(c, label),
  summary: computeSummaryRow(c, label),
  ...extra,
})

/**
 * 실데이터(일자별 카운트) → 조회 단위별 표시 행. 카운트만 합산(일→주→월)하고 비율은 재계산.
 */
export const getDisplayRowsFromCounts = (
  granularity: Granularity,
  dailies: CataractStatsDailyCounts[],
  period: string,
  lastDay: number,
): CataractDisplayRow[] =>
  buildDisplayRowsFromCounts(granularity, dailies, period, lastDay, {
    zeroCounts,
    sumCounts,
    isZeroCounts,
    buildRow: countRow,
  })

/** 시작일/종료일 범위로 표시 행 생성. 단일 월 범위면 getDisplayRowsFromCounts 와 동일 결과. */
export const getRangeDisplayRowsFromCounts = (
  granularity: Granularity,
  dailies: CataractStatsDailyCounts[],
  from: string,
  to: string,
): CataractDisplayRow[] =>
  buildRangeDisplayRowsFromCounts(granularity, dailies, from, to, {
    zeroCounts,
    sumCounts,
    isZeroCounts,
    buildRow: countRow,
  })

export const buildCataractStatsCsv = (rows: CataractDisplayRow[]): string =>
  buildStatsCsv(rows, {
    columnGroups: CATARACT_CSV_COLUMN_GROUPS,
    summaryColumns: SUMMARY_COLUMNS,
  })
