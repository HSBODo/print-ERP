import { addDays, isoWeek, toIsoDate } from '#shared/utils/isoWeek'

import type { ReservationChangeDailyCount } from '../../../type/api'
import { holidayDayLabel, holidayLabel } from './reservationChangeModel'

/**
 * 추이 달력 모델 — 한 달 그리드(월~일, ISO 주차 행)에 일별 등록·변경·변경률을 얹는다.
 * 기획서 §6 의 지표(등록 건수 · 변경 건수 · 변경률 %)와 기준(등록일 · 예약일)을 달력 한 장으로 본다.
 * 명절은 §6 명절 뷰처럼 당일 ±5일 창을 음영으로 표시한다.
 */

export type CalendarBasis = 'reg' | 'rsv'
export type CalendarMetric = 'total' | 'changed' | 'rate'
export const BASIS_LABEL: Record<CalendarBasis, string> = {
  reg: '등록일 기준',
  rsv: '예약일 기준',
}
export const METRIC_LABEL: Record<CalendarMetric, string> = {
  total: '등록 건수',
  changed: '변경 건수',
  rate: '변경률 %',
}

export interface DayCell {
  date: string
  dayOfMonth: number
  inMonth: boolean
  /** 0=월 … 6=일 */
  weekday: number
  total: number
  changed: number
  rate: number | null
  /** 명절 창(당일 ±5일) 라벨 · '' */
  holiday: string
  /** 명절 당일 라벨 · '' */
  holidayDay: string
}

export interface WeekRow {
  key: string
  isoYear: number
  isoWeek: number
  days: DayCell[]
  /** 그 달에 속한 날만 합산 — 주 합계의 합 = 월 합계 */
  total: number
  changed: number
  rate: number | null
}

export interface CalendarView {
  yearMonth: string
  weeks: WeekRow[]
  total: number
  changed: number
  rate: number | null
  /** 지표별 월 안 최대값 — 히트 색 농도 기준 */
  max: Record<CalendarMetric, number>
}

export const rateOf = (changed: number, total: number): number | null =>
  total ? Math.round((changed / total) * 1000) / 10 : null

const pad2 = (n: number) => String(n).padStart(2, '0')
const parseYm = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number)
  return { y, m }
}

export const shiftMonth = (yearMonth: string, delta: number): string => {
  const { y, m } = parseYm(yearMonth)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** 달력 그리드 범위 — 1일이 든 주의 월요일 ~ 말일이 든 주의 일요일 (최대 6주). */
export function calendarRange(yearMonth: string): { from: string; to: string } {
  const { y, m } = parseYm(yearMonth)
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const from = addDays(first, -((first.getDay() + 6) % 7))
  const to = addDays(last, 6 - ((last.getDay() + 6) % 7))
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export function buildCalendar(
  yearMonth: string,
  rows: ReservationChangeDailyCount[],
  branch: string,
): CalendarView {
  const byDay = new Map<string, { total: number; changed: number }>()
  for (const r of rows) {
    if (branch && r.branch !== branch) continue
    const acc = byDay.get(r.day) ?? { total: 0, changed: 0 }
    acc.total += r.total
    acc.changed += r.changed
    byDay.set(r.day, acc)
  }

  const { from, to } = calendarRange(yearMonth)
  const weeks: WeekRow[] = []
  let cursor = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  let monthTotal = 0
  let monthChanged = 0
  const max: Record<CalendarMetric, number> = { total: 0, changed: 0, rate: 0 }

  while (cursor <= end) {
    const days: DayCell[] = []
    let weekTotal = 0
    let weekChanged = 0
    for (let i = 0; i < 7; i++) {
      const date = toIsoDate(cursor)
      const counts = byDay.get(date) ?? { total: 0, changed: 0 }
      const inMonth = date.slice(0, 7) === yearMonth
      const rate = rateOf(counts.changed, counts.total)
      days.push({
        date,
        dayOfMonth: cursor.getDate(),
        inMonth,
        weekday: i,
        total: counts.total,
        changed: counts.changed,
        rate,
        holiday: holidayLabel(date),
        holidayDay: holidayDayLabel(date),
      })
      if (inMonth) {
        weekTotal += counts.total
        weekChanged += counts.changed
        max.total = Math.max(max.total, counts.total)
        max.changed = Math.max(max.changed, counts.changed)
        max.rate = Math.max(max.rate, rate ?? 0)
      }
      cursor = addDays(cursor, 1)
    }
    const monday = days[0].date
    const { year, week } = isoWeek(new Date(monday + 'T00:00:00'))
    weeks.push({
      key: monday,
      isoYear: year,
      isoWeek: week,
      days,
      total: weekTotal,
      changed: weekChanged,
      rate: rateOf(weekChanged, weekTotal),
    })
    monthTotal += weekTotal
    monthChanged += weekChanged
  }

  return {
    yearMonth,
    weeks,
    total: monthTotal,
    changed: monthChanged,
    rate: rateOf(monthChanged, monthTotal),
    max,
  }
}

export const metricValue = (
  cell: { total: number; changed: number; rate: number | null },
  metric: CalendarMetric,
): number | null => (metric === 'rate' ? cell.rate : cell[metric])

export const formatMetric = (
  value: number | null,
  metric: CalendarMetric,
): string =>
  value === null
    ? ''
    : metric === 'rate'
      ? `${value.toFixed(1)}%`
      : value.toLocaleString('ko-KR')
