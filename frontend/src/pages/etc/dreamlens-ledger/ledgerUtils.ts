import type { CsvColumn } from '@/utils/csv'
import type { DreamlensLedgerRow } from '@/api/etc'
import { addDays, isoWeek, isoWeekMonday, toIsoDate } from '@/utils/isoWeek'
import { LEDGER_COLUMNS, type LedgerFieldKey } from './ledgerColumns'

export type PeriodMode = 'daily' | 'weekly' | 'monthly'

/* ── 컬럼 정렬 (검사자·수술자 리스트와 동일 규약) ── */

export type SortDirection = 'asc' | 'desc'
export type SortState = { key: LedgerFieldKey; direction: SortDirection } | null

const COLUMN_TYPE = new Map(LEDGER_COLUMNS.map((column) => [column.key, column.type]))

/** 매출 컬럼은 숫자로, 나머지(날짜 포함)는 문자열로 비교한다. 날짜는 ISO 라 문자열 비교로 충분. */
export const getSortValue = (row: DreamlensLedgerRow, key: LedgerFieldKey): string | number => {
  const value = row[key]
  if (COLUMN_TYPE.get(key) === 'number') return Number(value ?? 0)
  return String(value ?? '').trim()
}

/** 빈 값은 방향과 무관하게 항상 뒤로 — 빈 칸이 많은 장부에서 위를 채우지 않게. */
export const compareSortValue = (a: string | number | null, b: string | number | null) => {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b

  return String(a).localeCompare(String(b), 'ko-KR', { numeric: true, sensitivity: 'base' })
}

export const formatCount = (count: number) => count.toLocaleString('ko-KR')

/* ── 페이지네이션 (수술자·검사자 리스트와 동일 규약) ── */

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]
export const DEFAULT_PAGE_SIZE = 50

/**
 * 표시할 페이지 번호 목록. 7페이지 이하는 전부, 그보다 많으면 1·현재±1·마지막만 두고
 * 끊긴 구간에 ellipsis 를 넣는다. (다른 리스트 화면의 동일 구현을 따른다)
 */
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

/** 기본 조회 구간 — 지난달 1일 ~ 오늘(장부는 최근 것을 주로 본다). */
export const defaultFrom = () => {
  const now = new Date()
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
}
export const defaultTo = () => toIsoDate(new Date())
export const today = () => toIsoDate(new Date())

/** 진행 중인 구간이면 오늘까지만 자른다 — 미래 조회는 의미가 없다. */
const clampToToday = (date: Date) => {
  const now = new Date()
  return toIsoDate(date > now ? now : date)
}

/* ── 월별 모드 헬퍼 (예약자 리스트와 동일 규약) ── */

export const toMonthValue = (date: string) => date.slice(0, 7)
export const toMonthStart = (month: string) => `${month}-01`
export const toMonthEnd = (month: string) => {
  const [year, mo] = month.split('-').map(Number)
  return clampToToday(new Date(year, mo, 0))
}

/* ── 주차 모드 헬퍼 ──
 * ISO 8601 연간 주차(월~일, 첫 목요일이 든 주가 1주차)를 쓴다. 주차 레포트·예약통계와 같은 기준이라
 * 화면끼리 "몇 주차"가 어긋나지 않는다. '그 달의 주차'(weekBucket)와는 다른 개념이니 주의.
 * <input type="week"> 의 값 형식(YYYY-Www)이 곧 ISO 주차라 변환 없이 맞물린다.
 */

export const toWeekValue = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const { year, week } = isoWeek(new Date(y, m - 1, d))
  return `${year}-W${String(week).padStart(2, '0')}`
}
export const toWeekStart = (weekValue: string) => {
  const [year, week] = weekValue.split('-W').map(Number)
  return toIsoDate(isoWeekMonday(year, week))
}
export const toWeekEnd = (weekValue: string) => {
  const [year, week] = weekValue.split('-W').map(Number)
  return clampToToday(addDays(isoWeekMonday(year, week), 6))
}

/** 이름·고객번호·검사자 부분일치. 공백 키워드는 통과. */
export const matchesKeyword = (row: DreamlensLedgerRow, keyword: string) => {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return true
  return [row.customerName, row.customerNo, row.examiner].some((value) =>
    (value ?? '').toLowerCase().includes(needle),
  )
}

/**
 * CSV 칼럼 — 화면 컬럼 순서 그대로 + 마지막에 행 합계.
 * 고객번호는 숫자로 보이지만 식별자라 Excel 이 지수표기로 바꾸지 않게 텍스트로 강제한다.
 */
export const csvColumnsOf = (): CsvColumn<DreamlensLedgerRow>[] => [
  ...LEDGER_COLUMNS.map((column) => ({
    key: column.key,
    label: column.label,
    text: column.key === 'customerNo',
    csv: (row: DreamlensLedgerRow) => {
      const value = row[column.key]
      if (column.type === 'number') return Number(value ?? 0)
      return value == null ? '' : String(value)
    },
  })),
  { key: 'totalRevenue', label: '행 합계', csv: (row) => row.totalRevenue },
]
