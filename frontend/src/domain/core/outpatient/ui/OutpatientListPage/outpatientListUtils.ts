import type { OutpatientListItem } from '../../type/api'

/**
 * OutpatientListPage 전용 순수 로직/상수 (렌더 무관).
 * 컬럼/뱃지 등 JSX 렌더 설정은 outpatientListColumns.tsx 참조.
 */

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

export const SKELETON_ROWS = 50

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
