import type { OutpatientListItem } from '../../type/api'

/**
 * OutpatientListPage 전용 순수 로직/상수 (렌더 무관).
 * 컬럼/뱃지 등 JSX 렌더 설정은 outpatientListColumns.tsx 참조.
 */

export type PeriodMode = 'daily' | 'monthly'
export type QuickRangeKey = '1w' | '2w' | '3w' | '4w' | 'monthly'
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

export const dash = (v: string) => (v && v.trim() ? v : '—')

export const calcAge = (birth: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birth)) return '—'
  const b = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
  return age >= 0 && age < 130 ? String(age) : '—'
}

export const STATE_OPTIONS = ['전체', '내원', '퇴원']
export const PATIENT_TYPE_OPTIONS = ['전체', '신환', '구환']

export const defaultFrom = () => toMonthStart(toMonthValue(todayIso()))
export const defaultTo = () => toMonthEnd(toMonthValue(todayIso()))
export const SKELETON_ROWS = 50
export const QUICK_RANGES: Array<{ key: QuickRangeKey; label: string }> = [
  { key: '1w', label: '1주' },
  { key: '2w', label: '2주' },
  { key: '3w', label: '3주' },
  { key: '4w', label: '4주' },
  { key: 'monthly', label: '월별' },
]

export const formatCount = (count: number) => count.toLocaleString('ko-KR')

const pad = (n: number) => String(n).padStart(2, '0')
export const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const toMonthValue = (date: string) => date.slice(0, 7)
export const toMonthStart = (month: string) => `${month}-01`
export const toMonthEnd = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDate = new Date(year, monthNumber, 0).getDate()
  return `${month}-${pad(lastDate)}`
}

export const toMonthWeekRange = (month: string, week: number) => {
  const startDay = (week - 1) * 7 + 1
  const monthEnd = toMonthEnd(month)
  const lastDay = Number(monthEnd.slice(-2))
  const endDay = week === 4 ? lastDay : Math.min(startDay + 6, lastDay)

  return {
    from: `${month}-${String(startDay).padStart(2, '0')}`,
    to: `${month}-${String(endDay).padStart(2, '0')}`,
  }
}

export const getSortValue = (
  row: OutpatientListItem,
  key: string,
  originalIndex: number,
) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  return String(row[key as keyof OutpatientListItem] ?? '').trim()
}

export const compareSortValue = (
  a: string | number | null,
  b: string | number | null,
) => {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  return String(a).localeCompare(String(b), 'ko-KR', {
    numeric: true,
    sensitivity: 'base',
  })
}
