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

/**
 * ISO 8601 주차 (1~53). 월요일 시작·목요일 규칙(첫 목요일이 든 주가 그 해의 1주).
 * 예) 2026-01-01(목) → {year:2026, week:1} · 2026-06-01(월) → {year:2026, week:23}.
 * 연말·연초 경계 주는 year 가 인접 해로 넘어갈 수 있으니 라벨링 시 함께 사용.
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // 일=0 → 7 로 취급해 월요일=1..일요일=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // 그 주의 목요일로 이동 (ISO 규칙)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

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
