import type { ExamListItem } from '../type/api'
import { EXAM_COUNT_CLASSES } from './cataractExamListUtils'

/**
 * ExamListPage 전용 순수 로직/상수 (렌더 무관).
 * 컬럼/뱃지 등 JSX 렌더 설정은 examListColumns.tsx 참조.
 */

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

export const formatExamType = (value: string) =>
  EXAM_TYPE_LABELS[value.trim()] ?? value

export const EXAM_CATEGORY_OPTIONS = ['전체', '시력교정', '드림렌즈']

export const SKELETON_ROWS = 50

export const getSortValue = (
  row: ExamListItem,
  key: string,
  originalIndex: number,
) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  if (key === 'examType') return formatExamType(row.examType)

  return String(row[key as keyof ExamListItem] ?? '').trim()
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

/**
 * 전체 검사자 리스트 '검사' 필터 (AllExamListPage).
 *
 * 백내장 예약 행은 백엔드에서 한 덩어리(examGroup='백내장', 2026-07 = 102)로 내려오지만,
 * 그중 월간 레포트 백내장 검사수에 들어가는 건 분류 '백내장'·'중단'(=56)뿐이다.
 * 나머지(노안/FU·기타 = 46)는 전체 검사수에만 더해지므로 필터에서 갈라 놓는다.
 * 분류 정의는 sql/exam/find-cataract-exam-list.sql 참조.
 */
export const CATARACT_REST_GROUP = '노안/FU/기타'
export const GROUP_FILTERS = [
  '전체',
  '시력교정',
  '드림렌즈',
  '백내장',
  CATARACT_REST_GROUP,
] as const

export const matchesExamGroup = (
  row: { examGroup: string; cataractClass: string },
  selected: string,
) => {
  if (selected === '전체') return true
  // '백내장' 은 레포트 검사수와 같은 집합만. cataractExamListUtils.EXAM_COUNT_CLASSES 와 같은 기준.
  if (selected === '백내장') {
    return (
      row.examGroup === '백내장' &&
      EXAM_COUNT_CLASSES.includes(row.cataractClass)
    )
  }
  if (selected === CATARACT_REST_GROUP) {
    return (
      row.examGroup === '백내장' &&
      !EXAM_COUNT_CLASSES.includes(row.cataractClass)
    )
  }
  return row.examGroup === selected
}
