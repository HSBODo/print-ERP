import type { SurgeryListItem } from '@/api/surgery/surgeryList'

/** SurgeryListPage 전용 순수 로직/상수 (렌더 무관). 컬럼 설정은 surgeryListColumns.tsx. */

export type PeriodMode = 'daily' | 'monthly'
export type QuickRangeKey = '1w' | '2w' | '3w' | '4w' | 'monthly'
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

export const dash = (v: string) => (v && v.trim() ? v : '—')

/** 주별 승인 패널의 주차 버킷 기준일 = 수술일 */
export const surgeryDateOf = (r: SurgeryListItem) => r.surgeryDate

export const calcAge = (birth: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birth)) return '—'
  const b = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
  return age >= 0 && age < 130 ? String(age) : '—'
}

export const CATEGORY_OPTIONS = ['전체', '시력교정', '백내장', '재수술']
export const DEFAULT_FROM = '2026-04-01'
export const DEFAULT_TO = '2026-04-30'
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
export const toMonthValue = (date: string) => date.slice(0, 7)
export const toMonthStart = (month: string) => `${month}-01`
export const toMonthEnd = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDate = new Date(year, monthNumber, 0).getDate()
  return `${month}-${String(lastDate).padStart(2, '0')}`
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

export const getSortValue = (row: SurgeryListItem, key: string, originalIndex: number) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  return String(row[key as keyof SurgeryListItem] ?? '').trim()
}

/**
 * 재수술 후보(자동 포함분)를 수술자 리스트 행 형태로 변환 — '재수술' 카테고리 필터용.
 * RE_OPERATION 출처라 채워지는 값은 수술일(=재수술일)·차트번호·고객명·수술방법 R/L 뿐(나머지는 공란).
 */
const BLANK_SURGERY_ROW: SurgeryListItem = {
  chartNo: '', name: '', nameEng: '', surgeryCategory: '', surgeryDate: '', examDate: '',
  patientType: '', surgeryReserveDate: '', surgeryRegDate: '', surgeryTime: '',
  surgeryR: '', surgeryL: '', recommendedR: '', recommendedL: '', estimate: '', surgeryRate: '',
  payment: '', surgeon: '', counselor: '', doctor: '', optometrist: '', birth: '', lunar: '',
  phone1: '', phone2: '', email: '', zip: '', addr1: '', addr2: '', memo: '', grade: '', job: '',
  lastVisit: '', route: '', section: '', motiveL: '', motiveM: '', motiveS: '', motiveMemo: '',
  examMemo: '', insurance: '', nationality: '',
}

export const reopCandidateToRow = (
  c: {
    chartNo: string; name: string; nameEng: string; patientType: string
    surgeon: string; payment: string; reopDate: string; againR: string; againL: string
  },
): SurgeryListItem => ({
  ...BLANK_SURGERY_ROW,
  chartNo: c.chartNo,
  name: c.name,
  nameEng: c.nameEng,
  patientType: c.patientType,
  surgeon: c.surgeon,
  payment: c.payment,
  surgeryCategory: '재수술',
  surgeryDate: c.reopDate,
  surgeryR: c.againR,
  surgeryL: c.againL,
})

export const compareSortValue = (a: string | number | null, b: string | number | null) => {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko-KR', { numeric: true, sensitivity: 'base' })
}
