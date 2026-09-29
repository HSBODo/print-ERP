import type { ExamListItem } from '../type/api'
import { EXAM_COUNT_CLASSES } from './cataractExamListUtils'

/**
 * ExamListPage 전용 순수 로직/상수 (렌더 무관).
 * 컬럼/뱃지 등 JSX 렌더 설정은 examListColumns.tsx 참조.
 */

export type PeriodMode = 'daily' | 'monthly'
export type QuickRangeKey = '1w' | '2w' | '3w' | '4w' | 'monthly'
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

/* ── 표시 헬퍼 ── */
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

export const EXAM_TYPE_LABELS: Record<string, string> = {
  '': '검사',
  '2': '재검사',
  '4': 'DNA검사',
  '5': '검사OP',
  '6': '당일재검사',
  '7': '검사OP(Re)',
}

export const formatExamType = (value: string) => EXAM_TYPE_LABELS[value.trim()] ?? value

export const EXAM_CATEGORY_OPTIONS = ['전체', '시력교정', '드림렌즈']

/** 기본 조회 기간 = 현재 월 1일 ~ 말일. (상수가 아니라 함수 — 탭을 오래 켜둬도 안 낡는다) */
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

/** 오늘 기준 전월 'YYYY-MM' (기본 조회 기간용 — 예: 2026-07 이면 '2026-06'). */
export const previousMonthValue = () => {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
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

export const getSortValue = (row: ExamListItem, key: string, originalIndex: number) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  if (key === 'examType') return formatExamType(row.examType)

  return String(row[key as keyof ExamListItem] ?? '').trim()
}

export const compareSortValue = (a: string | number | null, b: string | number | null) => {
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

/**
 * 전체 검사자 리스트 '검사' 필터 (AllExamListPage).
 *
 * 백내장 예약 행은 백엔드에서 한 덩어리(examGroup='백내장', 2026-07 = 102)로 내려오지만,
 * 그중 월간 레포트 백내장 검사수에 들어가는 건 분류 '백내장'·'중단'(=56)뿐이다.
 * 나머지(노안/FU·기타 = 46)는 전체 검사수에만 더해지므로 필터에서 갈라 놓는다.
 * 분류 정의는 sql/exam/find-cataract-exam-list.sql 참조.
 */
export const CATARACT_REST_GROUP = '노안/FU/기타'
export const GROUP_FILTERS = ['전체', '시력교정', '드림렌즈', '백내장', CATARACT_REST_GROUP] as const

export const matchesExamGroup = (
  row: { examGroup: string; cataractClass: string },
  selected: string,
) => {
  if (selected === '전체') return true
  // '백내장' 은 레포트 검사수와 같은 집합만. cataractExamListUtils.EXAM_COUNT_CLASSES 와 같은 기준.
  if (selected === '백내장') {
    return row.examGroup === '백내장' && EXAM_COUNT_CLASSES.includes(row.cataractClass)
  }
  if (selected === CATARACT_REST_GROUP) {
    return row.examGroup === '백내장' && !EXAM_COUNT_CLASSES.includes(row.cataractClass)
  }
  return row.examGroup === selected
}
