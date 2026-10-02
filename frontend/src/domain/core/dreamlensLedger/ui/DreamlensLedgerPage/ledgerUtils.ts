import type { CsvColumn } from '#shared/utils/csv'
import { type DateRange, todayIso, toIsoDate } from '#shared/utils/date'
import { maskAddress, maskName } from '#shared/utils/mask'

import type { DreamlensLedgerRow } from '../../type/api'
import { LEDGER_COLUMNS, type LedgerFieldKey } from './ledgerColumns'

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
export const defaultRange = (): DateRange => {
  const now = new Date()
  return {
    from: toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: todayIso(),
  }
}

/** 백엔드 DreamlensLedgerService 조회 구간 제한(양 끝 포함 92일)과 같다. */
export const LEDGER_MAX_DAYS = 92

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
