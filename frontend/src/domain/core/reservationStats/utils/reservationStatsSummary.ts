import { pct1 } from './reservationStatsCore'
import type { SummaryFormat } from './reservationStatsFormat'

/** 우측 종합 블록 한 행(내원·부도·취소). */
export interface SummaryRow {
  label: string
  totalReservationCount: number // 총예약건
  visit: number // 내원
  visitRate: number // 내원율(%)
  noShowReservation: number // 예약(부도)
  noShowRate: number // 부도율(%)
  cancel: number // 취소
  cancelRate: number // 취소율(%)
}

export interface SummaryColumnMeta {
  key: keyof Omit<SummaryRow, 'label'>
  label: string
  fmt: SummaryFormat
  emphasis?: boolean
}

export const SUMMARY_COLUMNS: SummaryColumnMeta[] = [
  { key: 'totalReservationCount', label: '총예약건', fmt: 'num' },
  { key: 'visit', label: '내원', fmt: 'num' },
  { key: 'visitRate', label: '내원율', fmt: 'pct1' },
  { key: 'noShowReservation', label: '예약(부도)', fmt: 'num' },
  { key: 'noShowRate', label: '부도율', fmt: 'pct1', emphasis: true },
  { key: 'cancel', label: '취소', fmt: 'num' },
  { key: 'cancelRate', label: '취소율', fmt: 'pct1', emphasis: true },
]

type SummaryCounts = {
  visit: number
  noShowReservation: number
  cancel: number
}

export const computeSummaryRow = <TCounts extends SummaryCounts>(
  counts: TCounts,
  label: string,
): SummaryRow => {
  const total = counts.visit + counts.noShowReservation + counts.cancel
  return {
    label,
    totalReservationCount: total,
    visit: counts.visit,
    visitRate: pct1(counts.visit, total),
    noShowReservation: counts.noShowReservation,
    noShowRate: pct1(counts.noShowReservation, total),
    cancel: counts.cancel,
    cancelRate: pct1(counts.cancel, total),
  }
}
