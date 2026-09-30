import type { CataractExamListItem } from '../type/api'

/** CataractExamListPage 전용 순수 로직/상수 (렌더 무관). 컬럼 설정은 cataractExamListColumns.tsx. */

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

/** 기본 조회 기간 = 현재 월 1일 ~ 말일. (상수가 아니라 함수 — 탭을 오래 켜둬도 안 낡는다) */
export const defaultFrom = () => toMonthStart(toMonthValue(todayIso()))
export const defaultTo = () => toMonthEnd(toMonthValue(todayIso()))
export const SKELETON_ROWS = 50
export const QUICK_RANGES: { key: QuickRangeKey; label: string }[] = [
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
  row: CataractExamListItem,
  key: string,
  originalIndex: number,
) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  return String(row[key as keyof CataractExamListItem] ?? '').trim()
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

/** 요약 칩에 고정으로 노출할 분류와 순서. 백엔드 분류(find-cataract-exam-list.sql)를 늘리면 여기도 함께 늘릴 것. */
export const CLASSIFICATION_ORDER: string[] = [
  '백내장',
  '중단',
  '노안/FU',
  '기타',
]

/** 월간 레포트 백내장 검사수에 들어가는 분류. sql/fragments/exam-session-source.sql 의 isCat 과 같은 집합. */
export const EXAM_COUNT_CLASSES: string[] = ['백내장', '중단']

export interface ClassificationBreakdown {
  breakdown: { name: string; count: number }[]
  examCount: number
  total: number
}

/**
 * 분류별 건수 집계. 실제 값을 세서 그대로 돌려준다.
 *
 * '아니면 백내장'으로 몰면 새 분류가 백내장에 합쳐져 조용히 틀린다
 * (노안/FU 를 추가했을 때 백내장이 45 대신 91 로 부풀었다).
 * 모르는 분류는 삼키지 않고 뒤에 붙여 화면에 드러낸다.
 *
 * examCount = 백내장 + 중단 = 월간 레포트 백내장 검사수. total(총건수)과 다르다.
 */
export const summarizeClassifications = (
  rows: Pick<CataractExamListItem, 'classification'>[],
): ClassificationBreakdown => {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.classification || '(미지정)'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const known = CLASSIFICATION_ORDER.map((name) => ({
    name,
    count: counts.get(name) ?? 0,
  }))
  const unknown = [...counts.entries()]
    .filter(([name]) => !CLASSIFICATION_ORDER.includes(name))
    .map(([name, count]) => ({ name, count }))
  const breakdown = [...known, ...unknown]
  return {
    breakdown,
    examCount: breakdown
      .filter(({ name }) => EXAM_COUNT_CLASSES.includes(name))
      .reduce((sum, { count }) => sum + count, 0),
    total: rows.length,
  }
}
