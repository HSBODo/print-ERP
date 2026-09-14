/** Shared pure helpers for reservation stats data modules. */

export type Granularity = 'month' | 'week' | 'yearWeek' | 'day' | 'all'

// 주별 = 해당 월의 주(1~5주) / 주차 = ISO 8601 연간 주차(1~53주). 두 뷰의 버킷 규칙이 달라 라벨·정렬이 다르다.
export const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'month', label: '월별' },
  { key: 'week', label: '주별' },
  { key: 'yearWeek', label: '주차' },
  { key: 'day', label: '일별' },
  { key: 'all', label: '전체' },
]

/** 행 계층 — 전체 보기에서 월/주/일 구간을 색으로 구분한다. */
export type RowTier = 'month' | 'week' | 'day'

/** 툴바 기본 선택 월(YYYY-MM) — 당월(현재 월). */
export const DEFAULT_PERIOD = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()

/** '2026-03' -> '3월' */
export const monthShortLabel = (period: string) => `${Number(period.slice(5, 7))}월`

/** '2026-03' -> '2026년 3월' */
export const monthFullLabel = (period: string) => `${period.slice(0, 4)}년 ${Number(period.slice(5, 7))}월`

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export const weekdayKo = (weekdayIndex: number): string => WEEKDAY_KO[weekdayIndex] ?? ''

/** 0-based calendar week within a month. */
export const weekOf = (day: number, firstWeekday: number): number => Math.floor((day - 1 + firstWeekday) / 7)

/** ISO 8601 주차 (1~53) — 구현은 공용 유틸(@/utils/isoWeek)에 있다. */
export { isoWeek } from '@/utils/isoWeek'

export const pctInt = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a * 100) / b))

export const pct1 = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a * 1000) / b) / 10)

export const createCountHelpers = <T extends object>(keys: readonly (keyof T)[]) => {
  const zeroCounts = (): T => Object.fromEntries(keys.map((key) => [key, 0])) as T

  const sumCounts = (rows: readonly T[]): T => {
    const acc = zeroCounts() as unknown as Record<keyof T, number>
    for (const row of rows) {
      const values = row as unknown as Record<keyof T, number>
      for (const key of keys) acc[key] += values[key]
    }
    return acc as unknown as T
  }

  const isZeroCounts = (counts: T): boolean => {
    const values = counts as unknown as Record<keyof T, number>
    return keys.every((key) => values[key] === 0)
  }

  return { zeroCounts, sumCounts, isZeroCounts }
}
