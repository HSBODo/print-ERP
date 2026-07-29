import type { CataractExamListItem } from '@/api/exam/cataractExamList'

/** CataractExamListPage 전용 순수 로직/상수 (렌더 무관). 컬럼 설정은 cataractExamListColumns.tsx. */

export type PeriodMode = 'daily' | 'monthly'
export type QuickRangeKey = '1w' | '2w' | '3w' | '4w' | 'monthly'
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

export const dash = (v: string) => (v && v.trim() ? v : '—')

/** 주별 승인 패널의 주차 버킷 기준일 = 검사일 */
export const examDateOf = (r: CataractExamListItem) => r.examDate

export const calcAge = (birth: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birth)) return '—'
  const b = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
  return age >= 0 && age < 130 ? String(age) : '—'
}

/** 기본 조회 기간 = 현재 월 1일 ~ 말일. (상수가 아니라 함수 — 탭을 오래 켜둬도 안 낡는다) */
export const defaultFrom = () => toMonthStart(toMonthValue(todayIso()))
export const defaultTo = () => toMonthEnd(toMonthValue(todayIso()))
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]
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
  const startDay = ((week - 1) * 7) + 1
  const monthEnd = toMonthEnd(month)
  const lastDay = Number(monthEnd.slice(-2))
  const endDay = week === 4 ? lastDay : Math.min(startDay + 6, lastDay)
  return {
    from: `${month}-${String(startDay).padStart(2, '0')}`,
    to: `${month}-${String(endDay).padStart(2, '0')}`,
  }
}

export const buildPaginationItems = (currentPage: number, pageMax: number): Array<number | string> => {
  if (pageMax <= 7) return Array.from({ length: pageMax }, (_, index) => index + 1)

  const pages = new Set([1, pageMax, currentPage - 1, currentPage, currentPage + 1])
  const normalized = [...pages].filter((page) => page >= 1 && page <= pageMax).sort((a, b) => a - b)

  return normalized.reduce<Array<number | string>>((items, page, index) => {
    const prev = normalized[index - 1]
    if (prev && page - prev > 1) items.push(`ellipsis-${prev}-${page}`)
    items.push(page)
    return items
  }, [])
}

export const getSortValue = (row: CataractExamListItem, key: string, originalIndex: number) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  return String(row[key as keyof CataractExamListItem] ?? '').trim()
}

export const compareSortValue = (a: string | number | null, b: string | number | null) => {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko-KR', { numeric: true, sensitivity: 'base' })
}
