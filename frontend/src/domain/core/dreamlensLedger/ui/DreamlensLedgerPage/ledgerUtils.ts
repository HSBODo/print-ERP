import type { CsvColumn } from '#shared/utils/csv'
import {
  addDays,
  isoWeek,
  isoWeekMonday,
  isoWeeksInYear,
  toIsoDate,
} from '#shared/utils/isoWeek'
import { maskAddress, maskName } from '#shared/utils/mask'

import type { DreamlensLedgerRow } from '../../type/api'
import { LEDGER_COLUMNS, type LedgerFieldKey } from './ledgerColumns'

export type PeriodMode = 'daily' | 'weekly' | 'monthly'

/* ── 컬럼 정렬 (검사자·수술자 리스트와 동일 규약) ── */

export type SortDirection = 'asc' | 'desc'
export type SortState = { key: LedgerFieldKey; direction: SortDirection } | null

const COLUMN_TYPE = new Map(
  LEDGER_COLUMNS.map((column) => [column.key, column.type]),
)

/** 매출 컬럼은 숫자로, 나머지(날짜 포함)는 문자열로 비교한다. 날짜는 ISO 라 문자열 비교로 충분. */
export const getSortValue = (
  row: DreamlensLedgerRow,
  key: LedgerFieldKey,
): string | number => {
  const value = row[key]
  if (COLUMN_TYPE.get(key) === 'number') return Number(value ?? 0)
  return String(value ?? '').trim()
}

/** 빈 값은 방향과 무관하게 항상 뒤로 — 빈 칸이 많은 장부에서 위를 채우지 않게. */
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

export const formatCount = (count: number) => count.toLocaleString('ko-KR')

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
 * 화면끼리 "몇 주차"가 어긋나지 않는다. '그 달의 주차'(월 경계에서 잘라 각 달로 귀속)와는 다른 개념이니 주의.
 * <input type="week"> 의 값 형식(YYYY-Www)이 곧 ISO 주차라 변환 없이 맞물린다.
 */

/** 장부에 데이터가 존재하는 첫 연도(D/L 장부 마이그레이션 기준 2006-10). 연도 드롭다운 하한. */
export const LEDGER_FIRST_YEAR = 2006

/** 연도 선택 목록 — 최신 연도부터 내림차순. */
export const ledgerYears = (): number[] => {
  const now = new Date().getFullYear()
  return Array.from({ length: now - LEDGER_FIRST_YEAR + 1 }, (_, i) => now - i)
}

/** 그 해의 주차 목록(1..52 또는 53). ISO 기준이라 해마다 53주가 있을 수 있다. */
export const isoWeekNumbers = (year: number): number[] =>
  Array.from({ length: isoWeeksInYear(year) }, (_, i) => i + 1)

export const weekValueOf = (year: number, week: number) =>
  `${year}-W${String(week).padStart(2, '0')}`

/** 'YYYY-MM-DD' → 그 날짜가 속한 ISO 주차. 연말·연초는 year 가 인접 해로 넘어간다. */
export const isoWeekOf = (date: string): { year: number; week: number } => {
  const [y, m, d] = date.split('-').map(Number)
  return isoWeek(new Date(y, m - 1, d))
}

export const toWeekValue = (date: string) => {
  const { year, week } = isoWeekOf(date)
  return weekValueOf(year, week)
}
export const toWeekStart = (weekValue: string) => {
  const [year, week] = weekValue.split('-W').map(Number)
  return toIsoDate(isoWeekMonday(year, week))
}
/**
 * 그 주의 일요일. 월별과 달리 오늘로 자르지 않는다 —
 * 주차를 드롭다운으로 직접 고를 수 있어, 미래 주를 클램프하면 시작일 > 종료일이 되어
 * 조회 자체가 막힌다. 미래 주는 그냥 0건으로 나오는 편이 예측 가능하다.
 */
export const toWeekEnd = (weekValue: string) => {
  const [year, week] = weekValue.split('-W').map(Number)
  return toIsoDate(addDays(isoWeekMonday(year, week), 6))
}

/** 이름·고객번호·검사자 부분일치. 공백 키워드는 통과. */
export const matchesKeyword = (row: DreamlensLedgerRow, keyword: string) => {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return true
  return [row.customerName, row.customerNo, row.examiner].some((value) =>
    (value ?? '').toLowerCase().includes(needle),
  )
}

/** 구매·배송 구분으로 볼 수 있는 값인지 — 정규화 규칙과 같은 키워드를 쓴다(주소는 하나도 걸리지 않음을 전수 확인). */
const PURCHASE_KEYWORD = /용품|대여|택배|텍배|본원\s*수령|재고|구매|배송/
const isPurchaseTypeValue = (value: string) => PURCHASE_KEYWORD.test(value)

/**
 * CSV 값 변환. **화면은 원문, 파일만 마스킹**한다 — utils/mask 의 프로젝트 규약과 동일하다
 * (직원은 화면에서 환자를 식별해야 하고, 파일은 PC 에 남고 메신저로 전달되므로 위험이 크다).
 *
 * 고객명 → maskName. 고객번호는 다른 리스트 화면의 차트번호와 같이 마스킹하지 않는다(행 대조에 필요).
 * 주소·구매구분 컬럼은 값이 섞여 있어, 구매 구분 키워드가 있으면 그대로 두고
 * 나머지(=실제 배송 주소)만 maskAddress 로 상세주소를 가린다.
 */
const csvValue = (
  column: (typeof LEDGER_COLUMNS)[number],
  row: DreamlensLedgerRow,
) => {
  const value = row[column.key]
  if (column.type === 'number') return Number(value ?? 0)
  const text = value == null ? '' : String(value)
  if (!text) return ''
  if (column.key === 'customerName') return maskName(text)
  if (column.key === 'purchaseType')
    return isPurchaseTypeValue(text) ? text : maskAddress(text)
  return text
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
    csv: (row: DreamlensLedgerRow) => csvValue(column, row),
  })),
  { key: 'totalRevenue', label: '행 합계', csv: (row) => row.totalRevenue },
]
